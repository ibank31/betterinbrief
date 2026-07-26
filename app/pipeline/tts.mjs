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
// Desain aman-spike:
// - config/pacing.json enabled=false mengembalikan perilaku lama 100%
//   (termasuk cache key TTS lama).
// - Scene satu kalimat memakai jalur & cache key lama persis (nol perubahan).
// - Deterministik: teks + voice + engine + speed + gap sama -> WAV sama;
//   QC semantic consistency tetap bisa menurunkan ulang render props.
// - Gerbang "scene tanpa napas": segmen bicara kontinu > breathlessWarnSec
//   dicatat sebagai PERINGATAN di log (non-fatal, threshold QC tidak diubah).

const r3 = (x) => Math.round(x * 1000) / 1000;

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

function synthesizeToCache(text, voice, voices, cacheDir, label) {
  const key = sha256Text([text, voice, voices.engine, voices.modelVersion, String(voices.speed)].join("|"));
  const cached = path.join(cacheDir, `${key}.wav`);
  let generated = false;
  if (!fs.existsSync(cached)) {
    log(`tts: generate ${label} (voice=${voice})`);
    const script = path.join(SYSTEM_DIR, "scripts", "kokoro_tts.py");
    const venv = voices.pythonEnv.replace("~", process.env.HOME || "~");
    const r = run("bash", ["-lc",
      `source ${venv}/bin/activate && python ${JSON.stringify(script)} --text ${JSON.stringify(text)} --voice ${JSON.stringify(voice)} --speed ${voices.speed} --out ${JSON.stringify(cached)}`]);
    if (r.status !== 0 || !fs.existsSync(cached)) {
      throw new Error(`TTS gagal untuk ${label}. Build DIHENTIKAN (tidak boleh ada paket final palsu).\n${(r.stderr || r.stdout || "").slice(-2000)}`);
    }
    generated = true;
  } else {
    log(`tts: cache hit ${label}`);
  }
  return {key, cached, generated};
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

    let sceneWav;
    let sceneKey;
    let generated = false;
    const sentenceMeta = [];
    if (sentences.length <= 1) {
      // Satu kalimat: jalur & cache key identik dengan mesin lama.
      const s = synthesizeToCache(spoken.text, locked.voice, voices, cacheDir, `${id}/${scene.id}`);
      sceneWav = s.cached;
      sceneKey = s.key;
      generated = s.generated;
    } else {
      const parts = sentences.map((text, si) => {
        const s = synthesizeToCache(text, locked.voice, voices, cacheDir, `${id}/${scene.id}#${si + 1}`);
        if (s.generated) generated = true;
        return {text, ...s};
      });
      sceneKey = sha256Text(["pacing-v1", String(gapSec), ...parts.map((p) => p.key)].join("|"));
      sceneWav = path.join(cacheDir, `${sceneKey}.wav`);
      if (!fs.existsSync(sceneWav)) {
        const gapWav = ensureGapWav(cacheDir, gapSec, sampleRate);
        const files = [];
        parts.forEach((p, i) => {
          files.push(p.cached);
          if (i < parts.length - 1) files.push(gapWav);
        });
        concatWavs(files, sampleRate, sceneWav);
        generated = true;
      }
      let cursor = 0;
      for (const p of parts) {
        const d = parseFloat(ffprobeJson(p.cached).format.duration);
        sentenceMeta.push({text: p.text, cacheKey: p.key, startSec: r3(cursor), durationSec: r3(d)});
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
    generatedAt: new Date().toISOString(), scenes: entries,
  };
  writeJson(path.join(P.work(id), "tts-manifest.json"), manifest);
  return manifest;
}
