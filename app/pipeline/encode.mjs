import fs from "node:fs";
import path from "node:path";
import {P, loadConfig, readJson, runOk, sha256File, writeJson, log} from "../cli/lib/util.mjs";

export function encodeEpisode(id) {
  const enc = loadConfig("platforms").encode;
  const brand = loadConfig("brand");
  const workDir = P.work(id);
  const render = readJson(path.join(workDir, "render-manifest.json"));
  const mix = readJson(path.join(workDir, "mix-manifest.json"));
  const out = path.join(workDir, "render", `${id}-publish-ready.mp4`);

  runOk("ffmpeg", ["-y", "-v", "error",
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
    "-ar", String(enc.audioSampleRate), "-ac", String(enc.audioChannels),
    "-movflags", enc.movflags,
    out]);

  const manifest = {
    episodeId: id, encodedAt: new Date().toISOString(),
    encoderSettings: enc, output: out, outputSha256: sha256File(out),
    inputs: {mezzanineSha256: render.mezzanineSha256, mixedAudioSha256: mix.mixedAudioSha256},
  };
  writeJson(path.join(workDir, "encode-manifest.json"), manifest);
  log(`encode: ${id} -> ${path.basename(out)}`);
  return manifest;
}
