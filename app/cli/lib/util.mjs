import {createHash} from "node:crypto";
import {execFileSync, spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

export const SYSTEM_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export function homeDir() {
  if (process.env.BINB_HOME) return path.resolve(process.env.BINB_HOME);
  const sd = "/sdcard/Download/BetterInBrief";
  try { if (fs.existsSync("/sdcard/Download")) return sd; } catch {}
  return path.join(os.homedir(), "BetterInBrief");
}

export const P = {
  episodes: (id) => path.join(homeDir(), "episodes", id),
  episodeJson: (id) => path.join(homeDir(), "episodes", id, "episode.json"),
  lockedJson: (id) => path.join(homeDir(), "episodes", id, "episode.locked.json"),
  work: (id) => path.join(homeDir(), "work", id),
  publish: (id) => path.join(homeDir(), "publish", id),
  logs: () => path.join(homeDir(), "logs"),
  ttsCache: () => path.join(homeDir(), "work", "_tts-cache"),
};

export function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { throw new Error(`Gagal membaca JSON ${p}: ${e.message}`); }
}
export function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), {recursive: true});
  fs.writeFileSync(p, `${JSON.stringify(obj, null, 2)}\n`);
}
export function loadConfig(name) {
  return readJson(path.join(SYSTEM_DIR, "config", `${name}.json`));
}
export function sha256File(p) {
  return createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}
export function sha256Text(t) {
  return createHash("sha256").update(t).digest("hex");
}
// Deterministic canonical JSON (sorted keys) for hashing/comparison.
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((k) =>
      `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
export function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...opts});
  if (r.error) throw new Error(`${cmd} gagal dijalankan: ${r.error.message}`);
  return r;
}
export function runOk(cmd, args, opts = {}) {
  const r = run(cmd, args, opts);
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} exit ${r.status}\n${(r.stderr || "").slice(-4000)}`);
  }
  return r;
}
export function ffprobeJson(file, extra = []) {
  const r = runOk("ffprobe", ["-v", "error", "-print_format", "json",
    "-show_format", "-show_streams", ...extra, file]);
  return JSON.parse(r.stdout);
}
export function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    fs.mkdirSync(P.logs(), {recursive: true});
    fs.appendFileSync(path.join(P.logs(), "binb.log"), `${line}\n`);
  } catch {}
}
export function fail(msg) { console.error(`\nERROR: ${msg}\n`); process.exit(1); }
export function freeGb(dir) {
  try {
    const s = fs.statfsSync(dir);
    return (s.bavail * s.bsize) / 1e9;
  } catch { return null; }
}
export function gitInfo() {
  try {
    const commit = execFileSync("git", ["rev-parse", "HEAD"], {cwd: SYSTEM_DIR, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"]}).trim();
    const dirty = execFileSync("git", ["status", "--porcelain"], {cwd: SYSTEM_DIR, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"]}).trim().length > 0;
    return {commit, dirtyWorkingTree: dirty};
  } catch { return {commit: null, dirtyWorkingTree: null}; }
}
export function toolVersion(cmd, args = ["--version"]) {
  try { return run(cmd, args).stdout.split("\n")[0].trim() || null; } catch { return null; }
}
