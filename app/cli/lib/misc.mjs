import fs from "node:fs";
import path from "node:path";
import {P, SYSTEM_DIR, homeDir, freeGb, gitInfo, loadConfig, readJson, toolVersion, writeJson, log} from "./util.mjs";

export function newEpisode(id) {
  if (!/^[A-Za-z0-9_-]{3,40}$/.test(id)) throw new Error("episode-id harus 3-40 karakter [A-Za-z0-9_-]");
  const dir = P.episodes(id);
  if (fs.existsSync(path.join(dir, "episode.json"))) {
    throw new Error(`${id} sudah ada di ${dir} - tidak akan menimpa.`);
  }
  fs.mkdirSync(path.join(dir, "sources"), {recursive: true});
  const template = readJson(path.join(SYSTEM_DIR, "examples", "Example_001", "episode.json"));
  const fresh = {
    ...template, episodeId: id, title: "Judul episode baru", status: "draft",
    sources: [], claims: [],
    scenes: template.scenes.map((s) => ({...s, claims: []})),
    packaging: {youtubeTitle: "", instagramCaption: "", tiktokCaption: "", hashtags: []},
  };
  writeJson(path.join(dir, "episode.json"), fresh);
  log(`new: episode ${id} dibuat di ${dir} (template dari Example_001, isi masih placeholder)`);
  console.log(`Edit ${path.join(dir, "episode.json")} lalu jalankan: binb validate ${id}`);
}

export function clean() {
  const home = homeDir();
  const targets = [
    path.join(home, "work", "_tts-cache"),
    path.join(SYSTEM_DIR, "app", "remotion", "public", "audio"),
  ];
  // hapus artefak work per-episode KECUALI manifests/qc (aman regenerate)
  const workDir = path.join(home, "work");
  if (fs.existsSync(workDir)) {
    for (const e of fs.readdirSync(workDir)) {
      if (e.startsWith("_") || e === "failed-builds" || e.endsWith(".json")) continue;
      targets.push(path.join(workDir, e, "render"), path.join(workDir, e, "mix"), path.join(workDir, e, "audio"));
    }
  }
  let freed = 0;
  for (const t of targets) {
    if (!fs.existsSync(t)) continue;
    const size = dirSize(t);
    fs.rmSync(t, {recursive: true, force: true});
    freed += size;
    log(`clean: hapus ${t} (${(size / 1e6).toFixed(1)} MB)`);
  }
  console.log(`Selesai. ~${(freed / 1e9).toFixed(2)} GB dibebaskan. Episode, sources, dan publish TIDAK disentuh.`);
}
function dirSize(dir) {
  let total = 0;
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, e.name);
    total += e.isDirectory() ? dirSize(full) : fs.statSync(full).size;
  }
  return total;
}

export function archiveEpisode(id) {
  const pub = P.publish(id);
  if (!fs.existsSync(pub)) throw new Error(`Tidak ada publish/${id} untuk diarsip.`);
  const dest = path.join(homeDir(), "archive", "published", `${id}-${new Date().toISOString().slice(0, 10)}`);
  if (fs.existsSync(dest)) throw new Error(`Arsip sudah ada: ${dest}`);
  fs.mkdirSync(path.dirname(dest), {recursive: true});
  fs.cpSync(pub, dest, {recursive: true});
  log(`archive: ${pub} -> ${dest} (salinan; publish asli tetap ada)`);
}

const REDACT = /(token|secret|password|api[_-]?key|bearer|authorization)[=:\s"']+\S+/gi;
export function diagnose() {
  const home = homeDir();
  const lines = [];
  lines.push("BinB diagnose report", `dibuat: ${new Date().toISOString()}`, "");
  lines.push(`BINB_HOME: ${home}`, `SYSTEM_DIR: ${SYSTEM_DIR}`);
  lines.push(`node: ${process.versions.node}`, `ffmpeg: ${toolVersion("ffmpeg", ["-version"]) || "-"}`);
  lines.push(`storage: ${freeGb("/") === null ? "-" : `${freeGb("/").toFixed(1)} GB free`}`);
  lines.push(`git: ${JSON.stringify(gitInfo())}`, "");
  for (const cfg of ["brand", "audio", "platforms", "voices", "limits"]) {
    try { lines.push(`--- config/${cfg}.json ---`, JSON.stringify(loadConfig(cfg)), ""); } catch (e) { lines.push(`config/${cfg}.json ERROR: ${e.message}`); }
  }
  const logFile = path.join(home, "logs", "binb.log");
  if (fs.existsSync(logFile)) {
    lines.push("--- 120 baris log terakhir ---");
    lines.push(...fs.readFileSync(logFile, "utf8").trim().split("\n").slice(-120));
  }
  const failed = path.join(home, "work", "failed-builds");
  if (fs.existsSync(failed)) lines.push("", `failed-builds: ${fs.readdirSync(failed).join(", ") || "(kosong)"}`);
  const out = path.join(home, "logs", `diagnose-${Date.now()}.txt`);
  fs.mkdirSync(path.dirname(out), {recursive: true});
  fs.writeFileSync(out, `${lines.join("\n").replace(REDACT, "$1=[REDACTED]")}\n`);
  console.log(`Diagnose report (tanpa secret): ${out}`);
  return out;
}
