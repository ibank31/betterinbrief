// align.mjs — Word-Timeline Engine (upgrade "human pacing" fase 1).
//
// Setelah TTS, setiap WAV scene ditranskripsi ulang dengan whisper.cpp
// (token-level DTW timestamps) lalu dipetakan kembali ke kata-kata narasi
// tampilan (yang memakai digit/simbol). Hasilnya align-manifest.json:
// timestamp mulai/selesai per kata narasi. compile.mjs memakai ini untuk
// caption kinetik yang mengikuti suara NYATA, bukan estimasi panjang huruf.
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

// Perkiraan jumlah kata lisan untuk satu kata tampilan (mis. "62%" -> 2 kata:
// "sixty-two percent"). Dipakai sebagai bobot pemetaan token whisper ->
// kata tampilan. Aproksimasi per-kata; pemetaan proporsional menoleransi
// selisih kecil.
function spokenWeight(displayWord) {
  const spoken = normalizeSpeechText(displayWord).text
    .replace(/[.,;:!?]+$/g, "").trim();
  if (!spoken) return 1;
  return Math.max(1, spoken.split(/\s+/).length);
}

// Petakan kata lisan (whisper) -> kata tampilan (narasi) secara proporsional
// berdasarkan bobot ekspansi. Selalu menghasilkan tepat displayWords.length
// entri dengan waktu monotonik naik.
export function mapSpokenToDisplay(displayWords, spokenWords) {
  const weights = displayWords.map(spokenWeight);
  const totalW = weights.reduce((a, b) => a + b, 0) || 1;
  const S = spokenWords.length;
  const out = [];
  let acc = 0;
  let cursor = 0;
  for (let i = 0; i < displayWords.length; i++) {
    const start = cursor;
    acc += weights[i];
    let stop = i === displayWords.length - 1 ? S : Math.round((acc / totalW) * S);
    stop = Math.min(S, Math.max(stop, start + 1));
    const first = spokenWords[Math.min(start, S - 1)];
    const last = spokenWords[Math.min(stop - 1, S - 1)];
    const prevEnd = out.length ? out[out.length - 1].endSec : 0;
    const startSec = Math.max(prevEnd, first.startMs / 1000);
    const endSec = Math.max(startSec + 0.01, last.endMs / 1000);
    out.push({text: displayWords[i], startSec: r3(startSec), endSec: r3(endSec)});
    cursor = Math.min(stop, S);
  }
  return out;
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
        const durLimit = entry.durationSec;
        words = mapped.map((w) => ({
          ...w,
          startSec: r3(Math.min(w.startSec, durLimit)),
          endSec: r3(Math.min(Math.max(w.endSec, w.startSec + 0.01), durLimit)),
        }));
      }
    } catch (e) {
      if (cfg.required) throw new Error(`align gagal untuk ${entry.sceneId}: ${e.message}`);
      log(`align: ${entry.sceneId} gagal (${e.message}) -> scene ini pakai caption ESTIMASI`);
    }
    if (words) log(`align: ${id}/${entry.sceneId} ok (${spokenCount} kata lisan -> ${words.length} kata tampilan)`);
    scenes.push({
      sceneId: entry.sceneId,
      wavSha256: entry.wavSha256,
      displayWordCount: displayWords.length,
      spokenWordCount: spokenCount,
      transcript,
      words,
    });
  }
  const manifest = {
    episodeId: id,
    engine: "whisper.cpp",
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
