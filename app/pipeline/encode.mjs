import fs from "node:fs";
import path from "node:path";
import {P, loadConfig, readJson, run, runOk, sha256File, writeJson, log} from "../cli/lib/util.mjs";

// Encode v2 - gerbang true-peak yang memverifikasi dirinya sendiri.
//
// Bukti build #32 (log D1): WAV mix sudah true-peak-safe (-1.7 dBTP) tetapi
// mp4 hasil encode terukur +1.4 dBTP - overshoot codec AAC ~3 dB pada materi
// yang dipadatkan pass koreksi bertingkat (pacing engine menggeser distribusi
// loudness sehingga pass koreksi mix menyala). Gerbang QC mengukur mp4 FINAL,
// maka encode kini memakai pengukuran yang SAMA (ebur128 true peak):
// - Attempt 1: perintah encode lama persis, tanpa filter audio - episode yang
//   dulu hijau menghasilkan output yang sama seperti sebelumnya.
// - Jika TP mp4 melewati ceiling config/audio.json, re-encode dengan limiter
//   4x oversample pre-codec yang ceiling-nya diturunkan sebesar overshoot
//   terukur + margin 0.4 dB. Maksimum 4 attempt, lalu build DIHENTIKAN.
// Limiter hanya mencukur transien sehingga integrated loudness praktis tidak
// berubah (gerbang LUFS QC tetap aman). Threshold QC TIDAK disentuh - mesin
// yang menyesuaikan diri, bukan gerbangnya.

function measureTruePeakDb(file) {
  const eb = run("ffmpeg", ["-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr;
  const matches = eb.match(/Peak:\s*(-?[\d.]+) dBFS/g);
  if (!matches || matches.length === 0) {
    throw new Error(`Tidak bisa mengukur true peak ${file}:\n${eb.slice(-1200)}`);
  }
  return parseFloat(matches[matches.length - 1].match(/-?[\d.]+/)[0]);
}

export function encodeEpisode(id) {
  const enc = loadConfig("platforms").encode;
  const brand = loadConfig("brand");
  const audioCfg = loadConfig("audio");
  const workDir = P.work(id);
  const render = readJson(path.join(workDir, "render-manifest.json"));
  const mix = readJson(path.join(workDir, "mix-manifest.json"));
  const out = path.join(workDir, "render", `${id}-publish-ready.mp4`);

  const encodeOnce = (audioFilter) => {
    const args = ["-y", "-v", "error",
      "-i", render.mezzanine, "-i", mix.mixedAudio,
      "-map", "0:v:0", "-map", "1:a:0",
      "-c:v", enc.videoCodec, "-profile:v", enc.profile, "-level:v", enc.level,
      "-crf", String(enc.crf), "-maxrate", `${enc.maxrateKbps}k`, "-bufsize", `${enc.bufsizeKbps}k`,
      "-vf", `setparams=range=${enc.colorRange}:color_primaries=${enc.colorPrimaries}:color_trc=${enc.colorTrc}:colorspace=${enc.colorSpace},format=${enc.pixelFormat}`,
      "-pix_fmt", enc.pixelFormat,
      "-color_range", enc.colorRange, "-colorspace", enc.colorSpace,
      "-color_primaries", enc.colorPrimaries, "-color_trc", enc.colorTrc,
      "-g", String(enc.gopSeconds * brand.canvas.fps),
      "-c:a", enc.audioCodec, "-b:a", `${enc.audioBitrateKbps}k`,
      "-ar", String(enc.audioSampleRate), "-ac", String(enc.audioChannels)];
    if (audioFilter) args.push("-af", audioFilter);
    args.push("-movflags", enc.movflags, out);
    runOk("ffmpeg", args);
  };

  const maxTp = audioCfg.truePeakMaxDbtp;
  const attempts = [];
  let ceilingDb = null; // attempt pertama: tanpa filter (jalur lama persis)
  let tp = null;
  for (let i = 0; i < 4; i++) {
    const filter = ceilingDb === null ? null :
      `aresample=${enc.audioSampleRate * 4},alimiter=limit=${Math.pow(10, ceilingDb / 20).toFixed(5)}:attack=5:release=100:level=false,aresample=${enc.audioSampleRate}`;
    encodeOnce(filter);
    tp = measureTruePeakDb(out);
    attempts.push({preCodecCeilingDbtp: ceilingDb, measuredTruePeakDbtp: tp});
    if (tp <= maxTp) break;
    const overshoot = tp - maxTp;
    ceilingDb = (ceilingDb === null ? maxTp : ceilingDb) - overshoot - 0.4;
    log(`encode: TP mp4 ${tp} dBTP > ${maxTp} dBTP (overshoot codec) -> re-encode dengan ceiling pre-codec ${ceilingDb.toFixed(2)} dBTP`);
  }
  if (tp === null || tp > maxTp) {
    throw new Error(`Encode gagal true-peak-safe: TP mp4 ${tp} dBTP > ${maxTp} dBTP setelah ${attempts.length} attempt. Build DIHENTIKAN (tidak boleh ada paket final palsu).`);
  }

  const manifest = {
    episodeId: id, encodedAt: new Date().toISOString(),
    encoderSettings: enc, output: out, outputSha256: sha256File(out),
    truePeakGuard: {maxDbtp: maxTp, measuredDbtp: tp, attempts},
    inputs: {mezzanineSha256: render.mezzanineSha256, mixedAudioSha256: mix.mixedAudioSha256},
  };
  writeJson(path.join(workDir, "encode-manifest.json"), manifest);
  log(`encode: ${id} -> ${path.basename(out)} (TP ${tp} dBTP, ${attempts.length} attempt)`);
  return manifest;
}
