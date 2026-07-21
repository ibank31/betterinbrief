import fs from "node:fs";
import path from "node:path";
import {SYSTEM_DIR, homeDir, freeGb, loadConfig, toolVersion} from "./util.mjs";

export function doctor() {
  const rows = [];
  const ok = (name, pass, detail) => rows.push({name, pass, detail});
  const envLock = loadConfig("environment.lock");
  const brand = loadConfig("brand");

  const nodeMajor = parseInt(process.versions.node.split(".")[0], 10);
  ok("node", nodeMajor === 20, `v${process.versions.node} (produksi harus Node 20 di Debian proot; Node ${nodeMajor} terdeteksi)`);
  ok("ffmpeg", Boolean(toolVersion("ffmpeg", ["-version"])), toolVersion("ffmpeg", ["-version"]) || "tidak ditemukan");
  ok("ffprobe", Boolean(toolVersion("ffprobe", ["-version"])), toolVersion("ffprobe", ["-version"]) || "tidak ditemukan");
  const chromium = process.env.BINB_CHROMIUM || "/usr/bin/chromium";
  ok("chromium", fs.existsSync(chromium), fs.existsSync(chromium) ? chromium : `${chromium} tidak ada (installer/02)`);
  ok("node_modules", fs.existsSync(path.join(SYSTEM_DIR, "node_modules", "remotion")), "dependency Remotion terpasang? (installer/02)");
  const venv = loadConfig("voices").pythonEnv.replace("~", process.env.HOME || "~");
  ok("kokoro-venv", fs.existsSync(path.join(venv, "bin", "activate")), `${venv} (installer/03)`);
  const fonts = brand.font.files.map((f) => path.join(SYSTEM_DIR, brand.font.bundledDir, f));
  ok("fonts", fonts.every((f) => fs.existsSync(f)), fonts.every((f) => fs.existsSync(f)) ? "Inter terbundel lengkap" : "font Inter belum lengkap (installer/04)");
  const home = homeDir();
  ok("binb-home", fs.existsSync(home), home);
  const free = freeGb(fs.existsSync(home) ? home : "/");
  const limits = loadConfig("limits");
  ok("storage", free === null || free >= limits.storage.stopFreeGb,
    free === null ? "tidak terbaca" : `${free.toFixed(1)} GB kosong (warning < ${limits.storage.warnFreeGb} GB, stop render < ${limits.storage.stopFreeGb} GB)`);
  ok("env-lock", true, `target: Node ${envLock.node}, Remotion ${envLock.remotion}, Kokoro ${envLock.kokoro}, ${envLock.arch}`);

  let allPass = true;
  console.log("\nBinB doctor\n===========");
  for (const r of rows) {
    if (!r.pass) allPass = false;
    console.log(`${r.pass ? "[OK]  " : "[FAIL]"} ${r.name}: ${r.detail}`);
  }
  console.log(allPass ? "\nSemua pemeriksaan lolos.\n" : "\nAda pemeriksaan yang gagal - lihat petunjuk di atas.\n");
  return allPass;
}
