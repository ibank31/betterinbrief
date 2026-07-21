import fs from "node:fs";
import path from "node:path";
import {P, SYSTEM_DIR, loadConfig, readJson, run, runOk} from "../cli/lib/util.mjs";

const check = (list, id, ok, detail, level = "error") =>
  list.push({id, status: ok ? "pass" : (level === "warning" ? "warn" : "fail"), detail});

function frameLuma(mp4, tSec, outJpg) {
  const r = run("ffmpeg", ["-y", "-v", "error", "-ss", String(tSec), "-i", mp4, "-frames:v", "1",
    "-vf", "signalstats,metadata=print:file=-", outJpg]);
  const m = (r.stdout || "").match(/YAVG=([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
}

export function qcVisual(id) {
  const brand = loadConfig("brand");
  const workDir = P.work(id);
  const mp4 = path.join(workDir, "render", `${id}-publish-ready.mp4`);
  const compile = readJson(path.join(workDir, "compile-manifest.json"));
  const stillsDir = path.join(workDir, "qc", "stills");
  fs.mkdirSync(stillsDir, {recursive: true});
  const checks = [];
  const fps = compile.fps;

  // Font bundling
  const fontDir = path.join(SYSTEM_DIR, brand.font.bundledDir);
  const missingFonts = brand.font.files.filter((f) => !fs.existsSync(path.join(fontDir, f)));
  check(checks, "visual.fontsBundled", missingFonts.length === 0,
    missingFonts.length ? `Font hilang di ${brand.font.bundledDir}: ${missingFonts.join(", ")} (jalankan installer/04)` : "semua font Inter terbundel");

  // Still per scene (midpoint) + luma
  const stills = [];
  for (const s of compile.sceneTimings) {
    const mid = (s.from + s.durationInFrames / 2) / fps;
    const jpg = path.join(stillsDir, `${s.id}.jpg`);
    const luma = frameLuma(mp4, mid, jpg);
    stills.push({scene: s.id, tSec: Math.round(mid * 100) / 100, file: jpg, yavg: luma});
    check(checks, `visual.still.${s.id}`, fs.existsSync(jpg) && luma !== null && luma > 4,
      `YAVG=${luma} @${mid.toFixed(2)}s ${luma !== null && luma <= 4 ? "- frame nyaris hitam total" : ""}`);
  }
  // Opening frame inspection (frame 0)
  const openJpg = path.join(stillsDir, "opening-frame0.jpg");
  const openLuma = frameLuma(mp4, 0, openJpg);
  check(checks, "visual.openingFrame", openLuma !== null && openLuma > 4,
    `frame 0 YAVG=${openLuma} - harus sudah menampilkan hook, bukan hitam`);

  // Contact sheet + cover
  const contact = path.join(workDir, "qc", "contact-sheet.jpg");
  const n = compile.sceneTimings.length;
  runOk("ffmpeg", ["-y", "-v", "error", "-i", mp4, "-vf",
    `select='not(mod(n\\,${Math.max(1, Math.floor(compile.totalFrames / 12))}))',scale=270:480,tile=4x3`,
    "-frames:v", "1", contact]);
  check(checks, "visual.contactSheet", fs.existsSync(contact), contact);
  const cover = path.join(workDir, "qc", "cover.jpg");
  runOk("ffmpeg", ["-y", "-v", "error", "-ss", "0.2", "-i", mp4, "-frames:v", "1", "-q:v", "2", cover]);
  check(checks, "visual.cover", fs.existsSync(cover), cover);

  // Safe zone / overflow: batas teks sudah divalidasi saat validate; stills untuk review manusia.
  check(checks, "visual.safeZoneReview", true,
    `Batas panjang teks lolos validasi (config/limits.json). Review stills di ${stillsDir} untuk cek safe-zone (L${brand.safeZones.left}/R${brand.safeZones.right}/T${brand.safeZones.top}/B${brand.safeZones.bottomReserve}).`, "warning");
  return {checks, stills, contactSheet: contact, cover};
}
