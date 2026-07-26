// align.mjs — Word-Timeline Engine v2.1.1 (upgrade "human pacing" fase 1).
//
// Setelah TTS, setiap WAV scene ditranskripsi ulang dengan whisper.cpp
// (token-level timestamps) lalu dipetakan kembali ke kata-kata narasi
// tampilan (yang memakai digit/simbol). Hasilnya align-manifest.json:
// timestamp mulai/selesai per kata narasi. compile.mjs memakai ini untuk
// caption kinetik yang mengikuti suara NYATA, bukan estimasi panjang huruf.
//
// v2 — perbaikan presisi berdasarkan audit sinkron r29:
// 1. Pemetaan kata lisan -> kata tampilan memakai alignment DP
//    (edit-distance, gaya Needleman-Wunsch), BUKAN kursor proporsional.
//    Saat whisper mendengar jumlah kata berbeda dari teks (mis. "$1.50"
//    -> "a dollar fifty"), error tidak lagi menyebar ke seluruh scene.
// 2. Snap-ke-onset: WAV narasi per scene adalah suara bersih tanpa musik,
//    jadi awal tiap kata dikoreksi ke onset energi vokal terdekat (jitter
//    timestamp whisper +-100-300ms terkunci kembali ke suara nyata).
// 3. Model default naik ke small.en (config/alignment.json) — timestamp
//    base.en terbukti terlalu jittery untuk karaoke.
//
// v2.1 — perbaikan berdasarkan audit sinkron r30 (scene padat angka):
// 4. Interpolasi kata tanpa pasangan kini BERBOBOT SUKU KATA, bukan rata:
//    "$1.50" (dibaca "a dollar fifty") mendapat porsi durasi jauh lebih
//    panjang daripada "a". Menghilangkan smear di blok angka/mata uang.
// 5. Jendela snap adaptif: kata pembuka frasa (setelah celah suara)
//    dikoreksi dengan jendela lebih lebar (0.25s), kata di tengah frasa
//    dengan jendela standar (0.18s) agar tidak mencomot onset tetangga.
//
// v2.1.1 — kalibrasi berdasarkan audit sinkron r31: jendela dasar 0.15s
//    terbukti membuang jangkar snap yang benar (snap turun 82->74) tanpa
//    kenaikan presisi terukur; dikembalikan ke 0.18s. Bobot suku kata dan
//    jendela lebar untuk pembuka frasa dipertahankan.
//
// Desain aman-spike:
// - config/alignment.json enabled=false mematikan stage ini sepenuhnya.
// - required=false: jika paket @remotion/install-whisper-cpp tidak terpasang
//   atau alignment gagal, build LANJUT dengan caption estimasi lama dan
//   kegagalannya dicatat jelas di log (tidak pernah diam-diam).
// - Deterministik terhadap input: WAV + model + versi sama -> hasil sama,
//   sehingga QC semantic consistency tetap bisa menurunkan ulang props.

import fs from "node:fs";
import path from "node:path";
import {P, loadConfig, readJson, writeJson, runOk, log} from "../cli/lib/util.mjs";
import {normalizeSpeechText} from "./speech-text.mjs";

const r3 = (x) => Math.round(x * 1000) / 1000;

export const whisperDir = () => path.join(path.dirname(P.ttsCache()), "_whisper");

function normToken(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9']/g, "");
}

// Perkiraan jumlah suku kata sebuah kata TAMPILAN, dihitung dari bentuk
// lisannya (normalizeSpeechText), sebagai bobot durasi saat interpolasi.
export function syllableWeight(displayWord) {
  const spoken = normalizeSpeechText(String(displayWord)).text || String(displayWord);
  let total = 0;
  for (const part of spoken.toLowerCase().split(/\s+/)) {
    const letters = part.replace(/[^a-z]/g, "");
    const groups = letters.match(/[aeiouy]+/g);
    total += groups ? groups.length : letters ? 1 : 0;
  }
  return Math.max(1, total);
}

function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({length: n + 1}, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

function tokenCost(a, b) {
  if (!a || !b) return 1;
  if (a === b) return 0;
  if (a.startsWith(b) || b.startsWith(a)) return 0.25;
  const d = lev(a, b) / Math.max(a.length, b.length);
  return d <= 0.34 ? 0.3 : 1;
}

// Token lisan yang DIHARAPKAN untuk tiap kata tampilan (mis. "62%" ->
// ["sixtytwo", "percent"]), dengan indeks kata tampilan pemiliknya.
function expectedTokens(displayWords) {
  const toks = [];
  displayWords.forEach((w, i) => {
    const spoken = normalizeSpeechText(w).text.replace(/[.,;:!?]+$/g, "").trim();
    let parts = (spoken ? spoken.split(/\s+/) : [w]).map(normToken).filter(Boolean);
    if (!parts.length) parts = [normToken(w) || "x"];
    for (const p of parts) toks.push({displayIdx: i, token: p});
  });
  return toks;
}

// Petakan kata lisan (whisper) -> kata tampilan (narasi) memakai DP
// edit-distance. Selalu menghasilkan tepat displayWords.length entri dengan
// waktu mulai monotonik naik; kata tanpa pasangan diinterpolasi di antara
// tetangga yang punya timestamp, berbobot suku kata (v2.1).
export function mapSpokenToDisplay(displayWords, spokenWords) {
  const exp = expectedTokens(displayWords);
  const spk = spokenWords.map((s) => ({...s, norm: normToken(s.text)}));
  const N = exp.length, M = spk.length;
  const GAP = 0.75;
  const dp = Array.from({length: N + 1}, () => new Float64Array(M + 1));
  const bt = Array.from({length: N + 1}, () => new Uint8Array(M + 1));
  for (let i = 1; i <= N; i++) { dp[i][0] = i * GAP; bt[i][0] = 1; }
  for (let j = 1; j <= M; j++) { dp[0][j] = j * GAP; bt[0][j] = 2; }
  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= M; j++) {
      const cDiag = dp[i - 1][j - 1] + tokenCost(exp[i - 1].token, spk[j - 1].norm);
      const cUp = dp[i - 1][j] + GAP;
      const cLeft = dp[i][j - 1] + GAP;
      if (cDiag <= cUp && cDiag <= cLeft) { dp[i][j] = cDiag; bt[i][j] = 3; }
      else if (cUp <= cLeft) { dp[i][j] = cUp; bt[i][j] = 1; }
      else { dp[i][j] = cLeft; bt[i][j] = 2; }
    }
  }
  const acc = displayWords.map(() => null);
  let i = N, j = M;
  while (i > 0 || j > 0) {
    const move = i === 0 ? 2 : j === 0 ? 1 : bt[i][j];
    if (move === 3) {
      const di = exp[i - 1].displayIdx;
      const s = spk[j - 1];
      if (!acc[di]) acc[di] = {startSec: s.startMs / 1000, endSec: s.endMs / 1000};
      else {
        acc[di].startSec = Math.min(acc[di].startSec, s.startMs / 1000);
        acc[di].endSec = Math.max(acc[di].endSec, s.endMs / 1000);
      }
      i--; j--;
    } else if (move === 1) i--;
    else j--;
  }
  // Interpolasi kata tanpa pasangan di antara jangkar bertimestamp,
  // porsi durasi proporsional terhadap bobot suku kata tiap kata (v2.1).
  let lastKnownEnd = 0;
  let k = 0;
  while (k < acc.length) {
    if (acc[k]) { lastKnownEnd = acc[k].endSec; k++; continue; }
    let e = k;
    while (e < acc.length && !acc[e]) e++;
    const startBound = lastKnownEnd;
    const endBound = e < acc.length ? acc[e].startSec : startBound + 0.25 * (e - k);
    const span = Math.max(endBound - startBound, 0.02 * (e - k));
    const weights = [];
    let weightSum = 0;
    for (let q = k; q < e; q++) {
      const w = syllableWeight(displayWords[q]);
      weights.push(w);
      weightSum += w;
    }
    let used = 0;
    for (let q = k; q < e; q++) {
      const w0 = used / weightSum;
      used += weights[q - k];
      const w1 = used / weightSum;
      acc[q] = {
        startSec: startBound + span * w0,
        endSec: startBound + span * w1,
      };
    }
    lastKnownEnd = acc[e - 1].endSec;
    k = e;
  }
  const out = [];
  let prevStart = -1;
  for (let q = 0; q < acc.length; q++) {
    const s = Math.max(acc[q].startSec, prevStart + 0.01);
    const e2 = Math.max(acc[q].endSec, s + 0.01);
    out.push({text: displayWords[q], startSec: r3(s), endSec: r3(e2)});
    prevStart = s;
  }
  return out;
}

// Deteksi onset vokal dari WAV 16k mono PCM s16le (suara narasi bersih,
// tanpa musik): RMS per 10ms, onset = transisi hening -> suara.
export function detectOnsets(wavPath) {
  const buf = fs.readFileSync(wavPath);
  if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") return [];
  let pos = 12, sr = 16000, data = null;
  while (pos + 8 <= buf.length) {
    const cid = buf.toString("ascii", pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    if (cid === "fmt " && pos + 16 <= buf.length) sr = buf.readUInt32LE(pos + 12);
    if (cid === "data") { data = buf.subarray(pos + 8, Math.min(buf.length, pos + 8 + size)); break; }
    pos += 8 + size + (size % 2);
  }
  if (!data || !sr) return [];
  const n = Math.floor(data.length / 2);
  const hop = Math.max(1, Math.round(sr * 0.01));
  const frames = Math.floor(n / hop);
  if (frames < 5) return [];
  const rms = new Float64Array(frames);
  let peak = 0;
  for (let f = 0; f < frames; f++) {
    let acc2 = 0;
    for (let s = f * hop; s < (f + 1) * hop; s++) {
      const v = data.readInt16LE(s * 2) / 32768;
      acc2 += v * v;
    }
    rms[f] = Math.sqrt(acc2 / hop);
    if (rms[f] > peak) peak = rms[f];
  }
  const thr = Math.max(peak * 0.07, 0.004);
  const onsets = [];
  let below = 3;
  for (let f = 0; f < frames; f++) {
    if (rms[f] < thr) { below++; continue; }
    if (below >= 3) onsets.push(r3(f * 0.01));
    below = 0;
  }
  return onsets;
}

// Koreksi awal kata ke onset vokal terdekat. Jendela adaptif (v2.1):
// kata pembuka frasa (setelah celah >= gapThresholdSec dari kata
// sebelumnya) memakai jendela lebar; kata di tengah frasa memakai jendela
// standar. Tiap onset dipakai maksimal satu kali; urutan tetap monotonik.
export function snapToOnsets(words, onsets, opts = {}) {
  const baseWindowSec = opts.baseWindowSec ?? 0.18;
  const gapWindowSec = opts.gapWindowSec ?? 0.25;
  const gapThresholdSec = opts.gapThresholdSec ?? 0.12;
  if (!onsets.length) return {words: words.map((w) => ({...w})), snapped: 0};
  const out = words.map((w) => ({...w}));
  let snapped = 0;
  let oi = 0;
  for (let q = 0; q < out.length; q++) {
    const prevEnd = q > 0 ? out[q - 1].endSec : -1;
    const phraseStart = q === 0 || out[q].startSec - prevEnd >= gapThresholdSec;
    const windowSec = phraseStart ? gapWindowSec : baseWindowSec;
    let best = -1, bestD = windowSec + 1;
    for (let k = oi; k < onsets.length; k++) {
      const d = Math.abs(onsets[k] - out[q].startSec);
      if (d < bestD) { bestD = d; best = k; }
      if (onsets[k] > out[q].startSec + windowSec) break;
    }
    if (best >= 0 && bestD <= windowSec) {
      out[q].startSec = onsets[best];
      oi = best + 1;
      snapped++;
    }
  }
  let prevStart = -1;
  for (let q = 0; q < out.length; q++) {
    out[q].startSec = r3(Math.max(out[q].startSec, prevStart + 0.01));
    out[q].endSec = r3(Math.max(out[q].endSec, out[q].startSec + 0.01));
    prevStart = out[q].startSec;
  }
  return {words: out, snapped};
}

async function ensureWhisper(api, cfg) {
  const to = whisperDir();
  await api.installWhisperCpp({to, version: cfg.whisperVersion});
  await api.downloadWhisperModel({model: cfg.model, folder: to});
  return to;
}

export async function runAlign(id, ttsManifest) {
  const cfg = loadConfig("alignment");
  if (!cfg.enabled) {
    log("align: nonaktif via config/alignment.json -> caption pakai ESTIMASI");
    return null;
  }
  let api;
  try {
    api = await import("@remotion/install-whisper-cpp");
  } catch {
    const msg = "align: paket @remotion/install-whisper-cpp belum terpasang (pasang: npm install --no-save @remotion/install-whisper-cpp@4.0.489)";
    if (cfg.required) throw new Error(msg);
    log(`${msg} -> build lanjut dengan caption ESTIMASI lama`);
    return null;
  }
  const locked = readJson(P.lockedJson(id));
  const narrationById = Object.fromEntries(locked.scenes.map((s) => [s.id, s.narration]));
  const outDir = path.join(P.work(id), "align");
  fs.mkdirSync(outDir, {recursive: true});

  let whisperPath;
  try {
    whisperPath = await ensureWhisper(api, cfg);
  } catch (e) {
    if (cfg.required) throw e;
    log(`align: instalasi whisper.cpp gagal (${e.message}) -> caption ESTIMASI`);
    return null;
  }

  const scenes = [];
  for (const entry of ttsManifest.scenes) {
    const narration = narrationById[entry.sceneId];
    const displayWords = String(narration || "").trim().split(/\s+/).filter(Boolean);
    const wav16 = path.join(outDir, `${entry.sceneId}.16k.wav`);
    runOk("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error",
      "-i", entry.wav, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav16]);
    let words = null;
    let spokenCount = 0;
    let snappedCount = 0;
    let transcript = "";
    try {
      const whisperCppOutput = await api.transcribe({
        inputPath: wav16,
        whisperPath,
        whisperCppVersion: cfg.whisperVersion,
        model: cfg.model,
        tokenLevelTimestamps: true,
        printOutput: false,
      });
      const {captions} = api.toCaptions({whisperCppOutput});
      const spoken = [];
      for (const c of captions) {
        const t = String(c.text || "").trim();
        if (!/[A-Za-z0-9]/.test(t)) {
          if (spoken.length) spoken[spoken.length - 1].endMs = Math.max(spoken[spoken.length - 1].endMs, c.endMs);
          continue;
        }
        spoken.push({text: t, startMs: c.startMs, endMs: c.endMs});
      }
      spokenCount = spoken.length;
      transcript = spoken.map((s) => s.text).join(" ");
      if (spoken.length > 0 && displayWords.length > 0) {
        const mapped = mapSpokenToDisplay(displayWords, spoken);
        const onsets = detectOnsets(wav16);
        const snapRes = snapToOnsets(mapped, onsets);
        snappedCount = snapRes.snapped;
        const durLimit = entry.durationSec;
        let prevStart = -1;
        words = snapRes.words.map((w) => {
          const s = Math.max(Math.min(w.startSec, durLimit), prevStart + 0.01);
          prevStart = s;
          return {
            text: w.text,
            startSec: r3(s),
            endSec: r3(Math.min(Math.max(w.endSec, s + 0.01), Math.max(durLimit, s + 0.01))),
          };
        });
      }
    } catch (e) {
      if (cfg.required) throw new Error(`align gagal untuk ${entry.sceneId}: ${e.message}`);
      log(`align: ${entry.sceneId} gagal (${e.message}) -> scene ini pakai caption ESTIMASI`);
    }
    if (words) log(`align: ${id}/${entry.sceneId} ok (${spokenCount} kata lisan -> ${words.length} kata tampilan, snap ${snappedCount} kata ke onset)`);
    scenes.push({
      sceneId: entry.sceneId,
      wavSha256: entry.wavSha256,
      displayWordCount: displayWords.length,
      spokenWordCount: spokenCount,
      snappedWordCount: snappedCount,
      transcript,
      words,
    });
  }
  const manifest = {
    episodeId: id,
    engine: "whisper.cpp",
    mappingEngine: "dp-v2.1.1+onset-snap-adaptive",
    model: cfg.model,
    whisperVersion: cfg.whisperVersion,
    generatedAt: new Date().toISOString(),
    scenes,
  };
  writeJson(path.join(P.work(id), "align-manifest.json"), manifest);
  const aligned = scenes.filter((s) => s.words).length;
  log(`align: ${aligned}/${scenes.length} scene punya word-timeline`);
  return manifest;
}
