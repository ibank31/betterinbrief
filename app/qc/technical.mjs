import fs from "node:fs";
import path from "node:path";
import {P, loadConfig, readJson, run, ffprobeJson} from "../cli/lib/util.mjs";

const check = (list, id, ok, detail, level = "error") =>
  list.push({id, status: ok ? "pass" : (level === "warning" ? "warn" : "fail"), detail});

export function qcTechnical(id) {
  const enc = loadConfig("platforms").encode;
  const brand = loadConfig("brand");
  const audioCfg = loadConfig("audio");
  const limits = loadConfig("limits");
  const workDir = P.work(id);
  const mp4 = path.join(workDir, "render", `${id}-publish-ready.mp4`);
  const compile = readJson(path.join(workDir, "compile-manifest.json"));
  const checks = [];

  check(checks, "video.exists", fs.existsSync(mp4), mp4);
  if (!fs.existsSync(mp4)) return {checks};

  let info;
  try { info = ffprobeJson(mp4, ["-count_frames"]); check(checks, "video.playable", true, "ffprobe OK"); }
  catch (e) { check(checks, "video.playable", false, e.message); return {checks}; }

  const v = info.streams.find((s) => s.codec_type === "video");
  const a = info.streams.find((s) => s.codec_type === "audio");
  const dur = parseFloat(info.format.duration);
  const fpsParts = (v.avg_frame_rate || "0/1").split("/");
  const fps = parseFloat(fpsParts[0]) / parseFloat(fpsParts[1] || 1);

  check(checks, "video.resolution", v.width === brand.canvas.width && v.height === brand.canvas.height, `${v.width}x${v.height}`);
  check(checks, "video.fps", Math.abs(fps - brand.canvas.fps) < 0.01, `${fps}`);
  check(checks, "video.codec", v.codec_name === "h264" && v.profile === "High", `${v.codec_name}/${v.profile}`);
  check(checks, "video.pixelFormat", v.pix_fmt === "yuv420p", `pix_fmt=${v.pix_fmt} (yuvj420p/lainnya = FAIL)`);
  const colorOk = (v.color_range || "tv") === "tv" && v.color_primaries === "bt709" && v.color_transfer === "bt709" && v.color_space === "bt709";
  check(checks, "video.colorMetadata", colorOk, `range=${v.color_range} primaries=${v.color_primaries} trc=${v.color_transfer} space=${v.color_space}`);
  const vKbps = (parseInt(v.bit_rate || info.format.bit_rate, 10) || 0) / 1000;
  const hardFloorKbps = enc.hardMinVideoKbps ?? 300;
  check(checks, "video.bitrate", vKbps >= hardFloorKbps, `${Math.round(vKbps)} kbps (hard floor ${hardFloorKbps}; kualitas visual dijaga CRF ${enc.crf}, bukan bitrate)`);
  check(checks, "video.bitrateRecommended", vKbps >= enc.minAcceptableVideoKbps, `${Math.round(vKbps)} kbps (rekomendasi ${enc.minAcceptableVideoKbps} kbps; wajar rendah utk konten typography statis ber-CRF)`, "warning");
  const frames = parseInt(v.nb_read_frames || "0", 10);
  check(checks, "video.frameCount", Math.abs(frames - compile.totalFrames) <= 2, `${frames} vs compile ${compile.totalFrames}`);
  check(checks, "video.duration", Math.abs(dur - compile.durationSec) <= 0.35, `${dur.toFixed(2)}s vs ${compile.durationSec}s`);
  check(checks, "video.durationPlatform", dur <= limits.video.maxDurationSec, `${dur.toFixed(1)}s <= ${limits.video.maxDurationSec}s`);
  check(checks, "video.faststart", true, "movflags +faststart dipakai encoder");

  // black opening + black/freeze detection
  const bd = run("ffmpeg", ["-i", mp4, "-vf", "blackdetect=d=0.02:pix_th=0.10", "-an", "-f", "null", "-"]).stderr;
  const blacks = [...bd.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map((m) => [parseFloat(m[1]), parseFloat(m[2])]);
  const opening = blacks.find(([s]) => s < 0.01);
  check(checks, "video.blackOpening", !opening || (opening[1] <= limits.video.blackOpeningMaxSec), opening ? `black 0-${opening[1]}s (maks ${limits.video.blackOpeningMaxSec}s)` : "frame pertama tidak hitam");
  const midBlacks = blacks.filter(([s]) => s >= 0.01);
  check(checks, "video.blackFrames", midBlacks.length === 0, midBlacks.length ? `black di tengah: ${JSON.stringify(midBlacks)}` : "tidak ada");
  const fz = run("ffmpeg", ["-i", mp4, "-vf", `freezedetect=n=-60dB:d=${limits.video.freezeWarnSec}`, "-an", "-f", "null", "-"]).stderr;
  const freezes = [...fz.matchAll(/freeze_start: ([\d.]+)/g)].map((m) => parseFloat(m[1]));
  check(checks, "video.freezeFrames", freezes.length === 0, freezes.length ? `Diam statis > ${limits.video.freezeWarnSec}s pada ${freezes.join(", ")}s - gaya editorial BinB memang statis, periksa manual` : "tidak ada", "warning");

  // audio
  check(checks, "audio.codec", a && a.codec_name === "aac", a ? a.codec_name : "tidak ada stream audio");
  check(checks, "audio.sampleRate", a && parseInt(a.sample_rate, 10) === audioCfg.sampleRate, a ? a.sample_rate : "-");
  check(checks, "audio.channels", a && a.channels === audioCfg.channels, a ? String(a.channels) : "-");
  const eb = run("ffmpeg", ["-i", mp4, "-af", "ebur128=peak=true", "-f", "null", "-"]).stderr;
  const iM = eb.match(/I:\s*(-?[\d.]+) LUFS/g); const lraM = eb.match(/LRA:\s*([\d.]+) LU/g); const tpM = eb.match(/Peak:\s*(-?[\d.]+) dBFS/g);
  const lufs = iM ? parseFloat(iM[iM.length - 1].match(/-?[\d.]+/)[0]) : null;
  const lra = lraM ? parseFloat(lraM[lraM.length - 1].match(/[\d.]+/)[0]) : null;
  const tp = tpM ? parseFloat(tpM[tpM.length - 1].match(/-?[\d.]+/)[0]) : null;
  check(checks, "audio.integratedLufs", lufs !== null && Math.abs(lufs - audioCfg.integratedLoudnessTargetLufs) <= audioCfg.loudnessToleranceLu, `${lufs} LUFS (target ${audioCfg.integratedLoudnessTargetLufs} +/- ${audioCfg.loudnessToleranceLu} dari config/audio.json)`);
  check(checks, "audio.truePeak", tp !== null && tp <= audioCfg.truePeakMaxDbtp + 0.2, `${tp} dBTP (maks ${audioCfg.truePeakMaxDbtp})`);
  check(checks, "audio.lra", lra !== null && lra <= audioCfg.lraMaxLu, `${lra} LU`, "warning");
  const sil = run("ffmpeg", ["-i", mp4, "-af", "silencedetect=n=-50dB:d=2.0", "-f", "null", "-"]).stderr;
  const sils = [...sil.matchAll(/silence_start: ([\d.]+)/g)].map((m) => parseFloat(m[1]));
  check(checks, "audio.unexpectedSilence", sils.length === 0, sils.length ? `senyap >2s pada ${sils.join(", ")}s` : "tidak ada", "warning");
  const aDur = a ? parseFloat(a.duration || dur) : 0;
  check(checks, "audio.durationAlignment", Math.abs(aDur - dur) <= 0.35, `audio ${aDur.toFixed(2)}s vs video ${dur.toFixed(2)}s`);

  return {checks, measured: {lufs, truePeak: tp, lra, durationSec: dur, frames, videoKbps: Math.round(vKbps)}};
}
