import fs from "node:fs";
import path from "node:path";
import {P, SYSTEM_DIR, loadConfig, readJson, run, runOk, sha256Text, sha256File, ffprobeJson, writeJson, log} from "../cli/lib/util.mjs";
import {normalizeSpeechText} from "./speech-text.mjs";

// Pacing Engine v1 (sentence-gap) — upgrade "human pacing" fase 2.
//
// Audit 4 video BinB vs shorts manusia: TTS membaca narasi scene sebagai SATU
// tarikan napas tanpa jeda (0 silence di semua video), padahal narator manusia
// berhenti 300-500ms di batas kalimat. Solusi di hulu: narasi dipecah per
// kalimat, tiap kalimat disintesis terpisah (cache per kalimat), lalu dirakit
// dengan hening sentenceGapSec di antaranya. Semua stage hilir mewarisi jeda
// ini secara otomatis: whisper mendengar celahnya, word-timeline merekamnya,
// caption ikut berhenti, dan duck musik sedikit mengangkat di tiap napas.
//
// Prosody Engine v1 (sentence-contour) — upgrade "penekanan antusias" fase 3.
//
// Narator manusia yang engaged tidak bicara satu tempo dan satu nada: kalimat
// pembuka masuk dengan energi, kalimat data diperlambat untuk penekanan,
// punchline dilepas pelan. Karena pacing v1 sudah mensintesis PER KALIMAT,
// tiap kalimat kini diberi kontur sendiri lewat dua tuas:
// - speed multiplier per kalimat (parameter speed Kokoro yang sudah ada)
// - pitch mikro via ffmpeg asetrate+aresample+atempo (durasi dikompensasi)
// Kontur ditentukan deterministik dari role scene + posisi kalimat + isi
// (kata bilangan). Kalimat netral mendapat jitter tempo mikro dari hash teks
// agar tidak ada dua kalimat bertempo identik.
//
// Desain aman-spike (berlaku untuk pacing DAN prosody):
// - config/pacing.json / config/prosody.json enabled=false mengembalikan
//   perilaku lama 100% (termasuk cache key TTS lama).
// - Deterministik: teks + voice + engine + speed + gap + kontur sama ->
//   WAV sama; QC semantic consistency tetap bisa menurunkan ulang render props.
// - Suara (termasuk mix multi-voice mis. "af_heart,af_kore") TIDAK diubah;
//   kontur hanya menyentuh tempo dan pitch mikro (maks +/-4%).
// - Gerbang "scene tanpa napas": segmen bicara kontinu > breathlessWarnSec
//   dicatat sebagai PERINGATAN di log (non-fatal, threshold QC tidak diubah).

const r3 = (x) => Math.round(x * 1000) / 1000;

const hashKey = (value) => {
  let h = 5381;
  for (let i = 0; i < value.length; i += 1) h = ((h * 33) ^ value.charCodeAt(i)) >>> 0;
  return h;
};

// Narasi sudah spoken-form saat dipecah (angka jadi kata), jadi deteksi
// "kalimat data" memakai kata bilangan, bukan digit.
const NUMBER_WORDS = /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|percent|dollars?|cents?)\b/i;

function probeVoiceWav(wav, audioCfg) {
  const info = ffprobeJson(wav);
  const stream = info.streams.find((s) => s.codec_type === "audio");
  const duration = parseFloat(info.format.duration);
  const issues = [];
  if (!stream) issues.push("tidak ada audio stream");
  if (stream && parseInt(stream.sample_rate, 10) !== audioCfg.voice.expectedSampleRate) {
    issues.push(`sample rate ${stream.sample_rate} != ${audioCfg.voice.expectedSampleRate}`);
  }
  const stats = run("ffmpeg", ["-i", wav, "-af", "astats=metadata=1,silencedetect=n=-45dB:d=1.5", "-f", "null", "-"]).stderr;
  const peakMatch = stats.match(/Peak level dB:\s*(-?[\d.]+)/);
  const peakDb = peakMatch ? parseFloat(peakMatch[1]) : null;
  if (peakDb !== null && peakDb > audioCfg.voice.clippingPeakDbfs) issues.push(`voice hampir/clipping: peak ${peakDb} dBFS`);
  const silences = [...stats.matchAll(/silence_start: ([\d.]+)/g)].map((m) => parseFloat(m[1]));
  return {duration, sampleRate: stream ? parseInt(stream.sample_rate, 10) : null, peakDb, longSilences: silences, issues};
}

// Pecah teks LISAN (sudah spoken-form, angka jadi kata) menjadi kalimat pada
// tanda [.!?]. Penjaga: fragmen berakhiran singkatan huruf tunggal (mis.
// "U.S.") atau lebih pendek dari minChars digabung ke tetangganya agar tidak
// tercipta jeda palsu di tengah frasa.
export function splitSentences(spokenText, minChars = 12) {
  const raw = String(spokenText).split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const merged = [];
  for (const part of raw) {
    const prev = merged.length ? merged[merged.length - 1] : null;
    if (prev && (/\b[A-Z]\.$/.test(prev) || prev.length < minChars)) {
      merged[merged.length - 1] = `${prev} ${part}`;
    } else {
      merged.push(part);
    }
  }
  if (merged.length > 1 && merged[merged.length - 1].length < minChars) {
    const last = merged.pop();
    merged[merged.length - 1] = `${merged[merged.length - 1]} ${last}`;
  }
  return merged.length ? merged : [String(spokenText).trim()];
}

// Kontur prosodi deterministik untuk satu kalimat. speedMul dikalikan
// voices.speed; null berarti default (tanpa perubahan -> cache key lama).
export function sentenceContour(scene, index, count, text, prosody) {
  if (!prosody.enabled) return {kind: "neutral", speedMul: null, pitchFactor: 1};
  if (scene.type === "closing_brand") return {kind: "brand", speedMul: null, pitchFactor: 1};
  const clampPitch = (f) => Math.min(prosody.maxPitchFactor, Math.max(prosody.minPitchFactor, f));
  if (index === count - 1 && count > 1 && (scene.role === "outcome" || scene.role === "decision")) {
    return {kind: "punchline", speedMul: prosody.punchline.speed, pitchFactor: clampPitch(prosody.punchline.pitchFactor)};
  }
  if (index === 0) {
    const c = scene.role === "hook" ? prosody.openerHook : prosody.opener;
    return {kind: "opener", speedMul: c.speed, pitchFactor: clampPitch(c.pitchFactor)};
  }
  if (NUMBER_WORDS.test(text)) {
    return {kind: "data", speedMul: prosody.data.speed, pitchFactor: clampPitch(prosody.data.pitchFactor)};
  }
  const jitter = ((hashKey(text) % 2001) / 1000 - 1) * (prosody.neutralJitterPct / 100);
  return {kind: "neutral", speedMul: r3(1 + jitter), pitchFactor: 1};
}

function synthesizeToCache(text, voice, voices, cacheDir, label, speed) {
  const key = sha256Text([text, voice, voices.engine, voices.modelVersion, String(speed)].join("|"));
  const cached = path.join(cacheDir, `${key}.wav`);
  let generated = false;
  if (!fs.existsSync(cached)) {
    log(`tts: generate ${label} (voice=${voice}, speed=${speed})`);
    const script = path.join(SYSTEM_DIR, "scripts", "kokoro_tts.py");
    const venv = voices.pythonEnv.replace("~", process.env.HOME || "~");
    const r = run("bash", ["-lc",
      `source ${venv}/bin/activate && python ${JSON.stringify(script)} --text ${JSON.stringify(text)} --voice ${JSON.stringify(voice)} --speed ${speed} --out ${JSON.stringify(cached)}`]);
    if (r.status !== 0 || !fs.existsSync(cached)) {
      throw new Error(`TTS gagal untuk ${label}. Build DIHENTIKAN (tidak boleh ada paket final palsu).\n${(r.stderr || r.stdout || "").slice(-2000)}`);
    }
    generated = true;
  } else {
    log(`tts: cache hit ${label}`);
  }
  return {key, cached, generated};
}

// Pitch mikro tanpa mengubah durasi: asetrate menggeser pitch+tempo, atempo
// mengembalikan tempo. Faktor kecil (maks +/-4%) agar bebas artefak.
function pitchShiftToCache(srcWav, srcKey, pitchFactor, sampleRate, cacheDir) {
  const key = sha256Text(["prosody-pitch-v1", srcKey, String(pitchFactor), String(sampleRate)].join("|"));
  const out = path.join(cacheDir, `${key}.wav`);
  let generated = false;
  if (!fs.existsSync(out)) {
    const atempo = (1 / pitchFactor).toFixed(6);
    runOk("ffmpeg", ["-y", "-v", "error", "-i", srcWav,
      "-af", `asetrate=${sampleRate}*${pitchFactor},aresample=${sampleRate},atempo=${atempo}`,
      "-ar", String(sampleRate), "-ac", "1", "-c:a", "pcm_s16le", out]);
    generated = true;
  }
  return {key, wav: out, generated};
}

function ensureGapWav(cacheDir, gapSec, sampleRate) {
  const name = `_gap-${String(gapSec).replace(/\./g, "_")}s-${sampleRate}.wav`;
  const p = path.join(cacheDir, name);
  if (!fs.existsSync(p)) {
    runOk("ffmpeg", ["-y", "-v", "error", "-f", "lavfi",
      "-i", `anullsrc=r=${sampleRate}:cl=mono`, "-t", String(gapSec), "-c:a", "pcm_s16le", p]);
  }
  return p;
}

// Rakit WAV kalimat + hening menjadi WAV scene. concat filter (bukan demuxer)
// dengan aformat eksplisit agar aman terhadap perbedaan sample format.
function concatWavs(files, sampleRate, outPath) {
  const inputs = [];
  for (const f of files) inputs.push("-i", f);
  const pre = files.map((_, i) => `[${i}:a]aformat=sample_fmts=s16:sample_rates=${sampleRate}:channel_layouts=mono[a${i}]`).join(";");
  const labels = files.map((_, i) => `[a${i}]`).join("");
  runOk("ffmpeg", ["-y", "-v", "error", ...inputs,
    "-filter_complex", `${pre};${labels}concat=n=${files.length}:v=0:a=1[out]`,
    "-map", "[out]", "-ar", String(sampleRate), "-ac", "1", "-c:a", "pcm_s16le", outPath]);
}

export function runTts(id) {
  const locked = readJson(P.lockedJson(id));
  const voices = loadConfig("voices");
  const audioCfg = loadConfig("audio");
  const pacing = loadConfig("pacing");
  const prosody = loadConfig("prosody");
  const cacheDir = P.ttsCache();
  const outDir = path.join(P.work(id), "audio");
  fs.mkdirSync(cacheDir, {recursive: true});
  fs.mkdirSync(outDir, {recursive: true});

  const gapSec = pacing.enabled ? pacing.sentenceGapSec : 0;
  const sampleRate = audioCfg.voice.expectedSampleRate;

  const entries = [];
  for (const scene of locked.scenes) {
    const spoken = normalizeSpeechText(scene.narration);
    if (spoken.changes.length) log(`tts: ${scene.id} narasi dinormalisasi ke spoken form (${spoken.changes.length} perubahan) utk prosodi natural`);
    const sentences = pacing.enabled ? splitSentences(spoken.text, pacing.minSentenceChars) : [spoken.text];
    const contours = sentences.map((text, si) => sentenceContour(scene, si, sentences.length, text, prosody));

    let sceneWav;
    let sceneKey;
    let generated = false;
    const sentenceMeta = [];
    if (sentences.length <= 1) {
      // Satu kalimat: jalur lama; dengan prosody nonaktif (atau kontur default)
      // cache key identik dengan mesin lama.
      const contour = contours[0];
      const speed = r3(voices.speed * (contour.speedMul ?? 1));
      const s = synthesizeToCache(spoken.text, locked.voice, voices, cacheDir, `${id}/${scene.id}`, speed);
      sceneKey = s.key;
      sceneWav = s.cached;
      generated = s.generated;
      if (contour.pitchFactor !== 1) {
        const p = pitchShiftToCache(s.cached, s.key, contour.pitchFactor, sampleRate, cacheDir);
        sceneKey = p.key;
        sceneWav = p.wav;
        if (p.generated) generated = true;
      }
      if (prosody.enabled && (contour.kind !== "neutral" || contour.speedMul !== null)) {
        log(`prosody: ${id}/${scene.id} ${contour.kind} speed=${speed} pitch=${contour.pitchFactor}`);
      }
    } else {
      const parts = sentences.map((text, si) => {
        const contour = contours[si];
        const speed = r3(voices.speed * (contour.speedMul ?? 1));
        const s = synthesizeToCache(text, locked.voice, voices, cacheDir, `${id}/${scene.id}#${si + 1}`, speed);
        if (s.generated) generated = true;
        let key = s.key;
        let wav = s.cached;
        if (contour.pitchFactor !== 1) {
          const p = pitchShiftToCache(s.cached, s.key, contour.pitchFactor, sampleRate, cacheDir);
          key = p.key;
          wav = p.wav;
          if (p.generated) generated = true;
        }
        if (prosody.enabled) {
          log(`prosody: ${id}/${scene.id}#${si + 1} ${contour.kind} speed=${speed} pitch=${contour.pitchFactor}`);
        }
        return {text, key, wav, contour, speed};
      });
      sceneKey = sha256Text(["pacing-v1", String(gapSec), ...parts.map((p) => p.key)].join("|"));
      sceneWav = path.join(cacheDir, `${sceneKey}.wav`);
      if (!fs.existsSync(sceneWav)) {
        const gapWav = ensureGapWav(cacheDir, gapSec, sampleRate);
        const files = [];
        parts.forEach((p, i) => {
          files.push(p.wav);
          if (i < parts.length - 1) files.push(gapWav);
        });
        concatWavs(files, sampleRate, sceneWav);
        generated = true;
      }
      let cursor = 0;
      for (const p of parts) {
        const d = parseFloat(ffprobeJson(p.wav).format.duration);
        sentenceMeta.push({
          text: p.text, cacheKey: p.key, startSec: r3(cursor), durationSec: r3(d),
          ...(prosody.enabled ? {prosody: {kind: p.contour.kind, speed: p.speed, pitchFactor: p.contour.pitchFactor}} : {}),
        });
        cursor += d + gapSec;
      }
      log(`pacing: ${id}/${scene.id} ${parts.length} kalimat, ${parts.length - 1} jeda napas ${gapSec}s`);
    }

    const probe = probeVoiceWav(sceneWav, audioCfg);
    if (probe.issues.length) {
      throw new Error(`TTS ${scene.id} tidak lolos pemeriksaan: ${probe.issues.join("; ")}`);
    }
    // Gerbang "scene tanpa napas": segmen bicara kontinu terpanjang.
    const longestRunSec = sentenceMeta.length ? Math.max(...sentenceMeta.map((s) => s.durationSec)) : probe.duration;
    if (pacing.enabled && longestRunSec > pacing.breathlessWarnSec) {
      log(`pacing: PERINGATAN ${id}/${scene.id} segmen tanpa napas ${longestRunSec.toFixed(1)}s > ${pacing.breathlessWarnSec}s - pertimbangkan memecah kalimat di narasi`);
    }
    const dest = path.join(outDir, `${scene.id}.wav`);
    fs.copyFileSync(sceneWav, dest);
    entries.push({
      sceneId: scene.id, cacheKey: sceneKey, generated,
      narrationSha256: sha256Text(scene.narration),
      spokenText: spoken.text,
      wav: dest, wavSha256: sha256File(dest),
      durationSec: probe.duration, sampleRate: probe.sampleRate, peakDb: probe.peakDb,
      ...(sentenceMeta.length ? {pacing: {gapSec, longestRunSec: r3(longestRunSec), sentences: sentenceMeta}} : {}),
    });
  }
  const manifest = {
    episodeId: id, voice: locked.voice, engine: voices.engine, modelVersion: voices.modelVersion,
    speed: voices.speed,
    pacing: {enabled: Boolean(pacing.enabled), engine: pacing.enabled ? "sentence-gap-v1" : null, sentenceGapSec: gapSec},
    prosody: {enabled: Boolean(prosody.enabled), engine: prosody.enabled ? "sentence-contour-v1" : null},
    generatedAt: new Date().toISOString(), scenes: entries,
  };
  writeJson(path.join(P.work(id), "tts-manifest.json"), manifest);
  return manifest;
}
