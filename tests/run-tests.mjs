#!/usr/bin/env node
/** BinB test runner - tanpa dependency eksternal. Exit != 0 jika ada test gagal. */
import {spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const SYSTEM_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const results = [];
const deviceOnly = [];
let tmpRoot;

function test(name, fn) { results.push({name, fn}); }
function deviceRequired(name, reason) { deviceOnly.push({name, reason}); }
function assert(cond, msg) { if (!cond) throw new Error(msg || "assertion failed"); }
function assertThrows(fn, substr, msg) {
  try { fn(); } catch (e) {
    if (substr && !String(e.message).includes(substr)) throw new Error(`${msg}: error "${e.message}" tidak memuat "${substr}"`);
    return e;
  }
  throw new Error(msg || "diharapkan melempar error");
}

const {canonicalJson, sha256Text, sha256File, readJson, writeJson} = await import("../app/cli/lib/util.mjs");
const {validateEpisode} = await import("../app/pipeline/validate.mjs");
const {lockEpisode, lockedCoreSha} = await import("../app/pipeline/lock.mjs");
const {deriveRenderProps, compileEpisode, splitCaptions} = await import("../app/pipeline/compile.mjs");
const {migrateOld} = await import("../app/pipeline/migrate.mjs");
const {chunkPlan, chunkCacheStatus} = await import("../app/pipeline/render.mjs");

const example = readJson(path.join(SYSTEM_DIR, "examples", "Example_001", "episode.json"));
const fakeTts = (ep) => ({
  episodeId: ep.episodeId, voice: ep.voice, engine: "kokoro", modelVersion: "0.7.16", speed: 1,
  // durasi realistis ~14 karakter/detik seperti Kokoro sungguhan
  scenes: ep.scenes.map((s) => ({sceneId: s.id, durationSec: Math.max(1.5, Math.round((s.narration.length / 14) * 100) / 100), sampleRate: 24000, peakDb: -3.5, wavSha256: "x"})),
});

// 1. Schema file & example validation
test("schema: episode.schema.json adalah JSON valid dengan field wajib", () => {
  const schema = readJson(path.join(SYSTEM_DIR, "schemas", "episode.schema.json"));
  assert(schema.required.includes("rights"), "rights wajib di schema");
  assert(schema.properties.scenes.items.properties.id.pattern === "^S[0-9]{2,}$", "scene ID pattern S\\d{2,}");
});
test("example: Example_001 lolos validasi penuh", () => {
  const {errors} = validateEpisode(example);
  assert(errors.length === 0, `Example_001 harus valid, dapat:\n${errors.join("\n")}`);
});

// 2. Runtime/validator negative cases
test("validate: rights=false ditolak", () => {
  const bad = structuredClone(example);
  bad.rights.factsVerified = false;
  assert(validateEpisode(bad).errors.some((e) => e.includes("rights.factsVerified")), "harus error rights");
});
test("validate: claim belum verified ditolak", () => {
  const bad = structuredClone(example);
  bad.claims[0].verified = false;
  assert(validateEpisode(bad).errors.some((e) => e.includes("belum verified")), "harus error verified");
});
test("validate: voice di luar config ditolak", () => {
  const bad = structuredClone(example);
  bad.voice = "not_a_voice";
  assert(validateEpisode(bad).errors.some((e) => e.includes("voices.json")), "harus error voice");
});
test("validate: scene ID melebihi S07 DIIZINKAN (S01..S08)", () => {
  const ep = structuredClone(example);
  const extra = [1, 2, 3].map(() => structuredClone(ep.scenes[2]));
  ep.scenes = [ep.scenes[0], ep.scenes[1], ep.scenes[2], ...extra, ep.scenes[3], ep.scenes[4]];
  ep.scenes.forEach((s, i) => { s.id = `S${String(i + 1).padStart(2, "0")}`; });
  const {errors} = validateEpisode(ep);
  assert(errors.length === 0, `8 scene harus valid:\n${errors.join("\n")}`);
});
test("validate: teks terlalu panjang (overflow guard) ditolak", () => {
  const bad = structuredClone(example);
  bad.scenes[0].visual.headline = "x".repeat(200);
  assert(validateEpisode(bad).errors.some((e) => e.includes("overflow")), "harus error overflow");
});

// 3. Scene mapping
test("scene mapping: variant salah untuk type ditolak", () => {
  const bad = structuredClone(example);
  bad.scenes[1].variant = "single_value";
  assert(validateEpisode(bad).errors.some((e) => e.includes("variant")), "harus error variant");
});
test("scene mapping: scene pertama harus hook, terakhir closing_brand", () => {
  const bad = structuredClone(example);
  [bad.scenes[0], bad.scenes[2]] = [bad.scenes[2], bad.scenes[0]];
  bad.scenes.forEach((s, i) => { s.id = `S${String(i + 1).padStart(2, "0")}`; });
  const errs = validateEpisode(bad).errors;
  assert(errs.some((e) => e.includes("pertama harus hook")), "harus error hook");
});

// 4+5. Lock immutability + hash consistency
test("hash: canonicalJson stabil terhadap urutan key", () => {
  const a = {b: 1, a: [{y: 2, x: 1}]};
  const b = {a: [{x: 1, y: 2}], b: 1};
  assert(canonicalJson(a) === canonicalJson(b), "canonical harus identik");
  assert(sha256Text(canonicalJson(a)) === sha256Text(canonicalJson(b)), "hash harus identik");
});
test("lock: menghasilkan locked+hash, menolak perubahan diam-diam, idempotent", () => {
  const home = path.join(tmpRoot, "lockhome");
  process.env.BINB_HOME = home;
  const id = example.episodeId;
  writeJson(path.join(home, "episodes", id, "episode.json"), example);
  const r1 = lockEpisode(id);
  const locked = readJson(path.join(home, "episodes", id, "episode.locked.json"));
  assert(locked.locked.sha256 === r1.sha256 && lockedCoreSha(locked) === r1.sha256, "hash locked konsisten");
  const r2 = lockEpisode(id);
  assert(r2.reused === true, "lock ulang tanpa perubahan harus reuse");
  const changed = structuredClone(example);
  changed.title = "Judul diubah diam-diam setelah lock!";
  writeJson(path.join(home, "episodes", id, "episode.json"), changed);
  assertThrows(() => lockEpisode(id), "force-relock", "perubahan setelah lock harus ditolak");
});
test("lock: episode tidak valid ditolak", () => {
  const home = path.join(tmpRoot, "lockhome2");
  process.env.BINB_HOME = home;
  const bad = structuredClone(example);
  bad.rights.musicLicensed = false;
  writeJson(path.join(home, "episodes", bad.episodeId, "episode.json"), bad);
  assertThrows(() => lockEpisode(bad.episodeId), "tidak bisa di-lock", "lock episode invalid harus gagal");
});

// 6. Manifest generation + deterministic compile
test("compile: deriveRenderProps deterministik & manifest lengkap", () => {
  const home = path.join(tmpRoot, "compilehome");
  process.env.BINB_HOME = home;
  const id = example.episodeId;
  writeJson(path.join(home, "episodes", id, "episode.json"), example);
  lockEpisode(id);
  const tts = fakeTts(example);
  const a = deriveRenderProps(readJson(path.join(home, "episodes", id, "episode.locked.json")), tts);
  const b = deriveRenderProps(readJson(path.join(home, "episodes", id, "episode.locked.json")), tts);
  assert(canonicalJson(a.renderProps) === canonicalJson(b.renderProps), "derivasi harus deterministik");
  const {contentManifest} = compileEpisode(id, tts);
  assert(contentManifest.visualTexts.length > 5, "visual text manifest terisi");
  assert(contentManifest.captions.length > 0, "caption manifest terisi");
  const scenes = contentManifest.scenes;
  for (let i = 1; i < scenes.length; i++) {
    assert(scenes[i].from === scenes[i - 1].from + scenes[i - 1].durationInFrames, "timing scene harus kontigu");
  }
  const props = readJson(path.join(home, "work", id, "render-props.json"));
  assert(props.schemaVersion === "1.1" && props.scenes[0].audio === `audio/${id}/S01.wav`, "render props shape benar");
});
test("captions: reading-speed & pemecahan teks", () => {
  const chunks = splitCaptions("Kalimat pertama yang cukup panjang untuk dipecah. Kalimat kedua.", 40);
  assert(chunks.length >= 2 && chunks.every((c) => c.length <= 40), "caption terpecah sesuai batas");
});

// 6b. Renderer resume contract: two valid chunks must survive a missing middle
// chunk, while changed props invalidate the entire cache. No Remotion render is
// needed; a tiny valid A/V fixture exercises the same ffprobe validation path.
test("render cache: resume hanya melewati chunk valid setelah kegagalan tengah", () => {
  const chunkDir = path.join(tmpRoot, "chunk-cache");
  fs.mkdirSync(chunkDir, {recursive: true});
  const plan = chunkPlan(601);
  const fixture = path.join(chunkDir, "fixture.mp4");
  const made = spawnSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=s=128x128:r=30", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", "1", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", fixture], {encoding: "utf8"});
  assert(made.status === 0, `fixture ffmpeg gagal: ${made.stderr}`);
  // Simulate a run where chunk 300-599 crashed, while the completed edge
  // chunks remain intact on disk.
  fs.copyFileSync(fixture, path.join(chunkDir, plan[0].file));
  fs.copyFileSync(fixture, path.join(chunkDir, plan[2].file));
  const state = {propsSha256: "props-a", frameCount: 601, chunkFrames: 300, renderer: {version: "chunked-v1"}, chunks: plan};
  const resumed = chunkCacheStatus({previous: structuredClone(state), state, chunkDir});
  assert(resumed.compatible === true, "manifest identik harus kompatibel");
  assert(resumed.validChunks.length === 2, "hanya dua chunk selesai yang boleh cache hit");
  assert(resumed.validChunks.includes(plan[0].file) && resumed.validChunks.includes(plan[2].file), "chunk awal dan akhir harus dipertahankan");
  const changedProps = {...state, propsSha256: "props-b"};
  const invalidated = chunkCacheStatus({previous: state, state: changedProps, chunkDir});
  assert(invalidated.compatible === false && invalidated.validChunks.length === 0, "props baru harus membatalkan cache lama");
});

// 7. REGRESSION: JOB LOSS vs REPLACEMENT harus GAGAL
test("REGRESSION mismatch: locked JOB LOSS vs render REPLACEMENT -> FAIL", async () => {
  const home = path.join(tmpRoot, "mismatchhome");
  process.env.BINB_HOME = home;
  const ep = structuredClone(example);
  ep.episodeId = "Seed_001R";
  ep.scenes[1].visual.misconception = "JOB LOSS";
  ep.scenes[3].visual.comparison = "> JOB LOSS";
  const id = ep.episodeId;
  writeJson(path.join(home, "episodes", id, "episode.json"), ep);
  fs.mkdirSync(path.join(home, "episodes", id, "sources"), {recursive: true});
  fs.writeFileSync(path.join(home, "episodes", id, "sources", "evidence.txt"), "bukti\n");
  lockEpisode(id);
  const tts = fakeTts(ep);
  writeJson(path.join(home, "work", id, "tts-manifest.json"), tts);
  compileEpisode(id, tts);
  const propsPath = path.join(home, "work", id, "render-props.json");
  const {qcContent} = await import("../app/qc/content.mjs");
  // Kasus sehat: props utuh -> semantic PASS
  writeJson(path.join(home, "work", id, "render-manifest.json"), {propsSha256: sha256File(propsPath)});
  const good = qcContent(id).checks;
  assert(good.find((c) => c.id === "content.semanticConsistency").status === "pass", "kasus sehat harus pass");
  assert(good.find((c) => c.id === "content.renderInputHash").status === "pass", "hash render input harus pass");
  // Kasus audit: props di-tamper seperti insiden lama -> harus FAIL
  const tampered = fs.readFileSync(propsPath, "utf8").replaceAll("JOB LOSS", "REPLACEMENT");
  fs.writeFileSync(propsPath, tampered);
  const cmPath = path.join(home, "work", id, "render-content-manifest.json");
  fs.writeFileSync(cmPath, fs.readFileSync(cmPath, "utf8").replaceAll("JOB LOSS", "REPLACEMENT"));
  writeJson(path.join(home, "work", id, "render-manifest.json"), {propsSha256: sha256File(propsPath)});
  const checks = qcContent(id).checks;
  const sem = checks.find((c) => c.id === "content.semanticConsistency");
  assert(sem.status === "fail", "MISMATCH TIDAK TERDETEKSI - gerbang semantik rusak!");
  assert(sem.detail.includes("REPLACEMENT"), "detail harus menunjukkan diff");
  const stray = checks.find((c) => c.id === "content.visualTextManifest");
  assert(stray.status === "fail", "teks asing harus terdeteksi di visual text manifest");
});

// 8. Audio single-source config
test("audio: satu kebijakan canonical di config/audio.json", () => {
  const audio = readJson(path.join(SYSTEM_DIR, "config", "audio.json"));
  assert(typeof audio.integratedLoudnessTargetLufs === "number" && typeof audio.truePeakMaxDbtp === "number", "field target wajib ada");
  const files = ["app/pipeline/mix.mjs", "app/pipeline/encode.mjs", "app/qc/technical.mjs"];
  for (const f of files) {
    const src = fs.readFileSync(path.join(SYSTEM_DIR, f), "utf8");
    assert(!/(-\d+(\.\d+)?)\s*LUFS|integratedLoudness\w*\s*[:=]\s*-\d/.test(src.replace(/\/\/.*$/gm, "")),
      `${f} tidak boleh hardcode target LUFS (harus baca config/audio.json)`);
    assert(src.includes('loadConfig("audio")') || !src.includes("Lufs"), `${f} membaca config audio`);
  }
});

// 9. Encoder config
test("encoder: platforms.json memenuhi spesifikasi final", () => {
  const enc = readJson(path.join(SYSTEM_DIR, "config", "platforms.json")).encode;
  assert(enc.pixelFormat === "yuv420p", "pix_fmt harus yuv420p");
  assert(enc.colorRange === "tv", "range harus tv/limited");
  assert(enc.colorPrimaries === "bt709" && enc.colorTrc === "bt709" && enc.colorSpace === "bt709", "Rec.709 lengkap");
  assert(enc.maxrateKbps >= 4000 && enc.maxrateKbps <= 8000, "target 4-8 Mbps");
  assert(enc.audioSampleRate === 48000 && enc.audioChannels === 2 && enc.audioCodec === "aac", "AAC 48k stereo");
  assert(enc.movflags.includes("faststart"), "faststart wajib");
});

// 10. Migration dry-run
test("migrate: default dry-run tidak menyalin apa pun & dedupe hash", () => {
  const home = path.join(tmpRoot, "mighome");
  process.env.BINB_HOME = home;
  const old = path.join(tmpRoot, "oldsystem");
  fs.mkdirSync(path.join(old, "00_Brand"), {recursive: true});
  fs.mkdirSync(path.join(old, "10_Publish_Ready/Seed_01"), {recursive: true});
  fs.mkdirSync(path.join(old, "09_Backups"), {recursive: true});
  fs.writeFileSync(path.join(old, "00_Brand", "logo.png"), "PNGDATA");
  fs.writeFileSync(path.join(old, "10_Publish_Ready/Seed_01", "final.mp4"), "MP4DATA");
  fs.writeFileSync(path.join(old, "10_Publish_Ready/Seed_01", "final-copy.mp4"), "MP4DATA");
  fs.writeFileSync(path.join(old, "09_Backups", "x.bak"), "BAK");
  const r = migrateOld(old, {apply: false});
  assert(r.applied === false, "default harus dry-run");
  const plan = readJson(r.planPath).plan;
  assert(plan.find((p) => p.file.endsWith("logo.png")).as === "brand", "brand terklasifikasi");
  const dupOps = plan.filter((p) => p.file.endsWith(".mp4")).map((p) => p.op).sort();
  assert(dupOps.join(",") === "copy,skip-duplicate", `duplikat via hash terdeteksi (dapat: ${dupOps.join(",")})`);
  assert(plan.find((p) => p.file.endsWith("x.bak")).op === "skip", "backup .bak dilewati");
  assert(!fs.existsSync(path.join(home, "assets", "brand", "logo.png")), "dry-run tidak boleh menyalin");
  assert(fs.existsSync(path.join(old, "00_Brand", "logo.png")), "file lama tidak boleh hilang");
});

// 11. Installer & shell syntax
test("installer: semua skrip .sh lolos bash -n", () => {
  const root = path.join(SYSTEM_DIR, "..");
  const shs = ["install.sh", "update.sh", "uninstall.sh",
    ...fs.readdirSync(path.join(root, "installer")).map((f) => `installer/${f}`)];
  for (const f of shs) {
    const r = spawnSync("bash", ["-n", path.join(root, f)], {encoding: "utf8"});
    assert(r.status === 0, `${f}: ${r.stderr}`);
  }
});
test("syntax: semua .mjs lolos node --check", () => {
  const walk = (d, out = []) => {
    for (const e of fs.readdirSync(d, {withFileTypes: true})) {
      const full = path.join(d, e.name);
      if (e.isDirectory() && e.name !== "node_modules") walk(full, out);
      else if (e.name.endsWith(".mjs")) out.push(full);
    }
    return out;
  };
  for (const f of walk(path.join(SYSTEM_DIR, "app"))) {
    const r = spawnSync("node", ["--check", f], {encoding: "utf8"});
    assert(r.status === 0, `${f}: ${r.stderr}`);
  }
});

// 12. CLI argument tests
test("cli: help & version exit 0, perintah tak dikenal exit 1", () => {
  const home = path.join(tmpRoot, "clihome");
  const env = {...process.env, BINB_HOME: home};
  const cli = path.join(SYSTEM_DIR, "app", "cli", "binb.mjs");
  assert(spawnSync("node", [cli, "help"], {encoding: "utf8", env}).status === 0, "help harus exit 0");
  const v = spawnSync("node", [cli, "version"], {encoding: "utf8", env});
  assert(v.status === 0 && v.stdout.includes("binb 1.0.0"), "version harus tampil");
  assert(spawnSync("node", [cli, "nonsense"], {encoding: "utf8", env}).status === 1, "perintah salah exit 1");
  assert(spawnSync("node", [cli, "build"], {encoding: "utf8", env}).status === 1, "build tanpa id exit 1");
});

// 13. JSON configs valid
test("config: semua file config & migration-rules adalah JSON valid", () => {
  for (const f of fs.readdirSync(path.join(SYSTEM_DIR, "config"))) readJson(path.join(SYSTEM_DIR, "config", f));
  readJson(path.join(SYSTEM_DIR, "..", "migration", "migration-rules.json"));
});

// 14-15. Butuh dependency ARM64/network -> device verification required
deviceRequired("npm ci + Remotion typecheck (tsc --noEmit)", "butuh node_modules dari registry; sandbox tanpa network. Dijalankan installer/02 + `npm run typecheck` di HP.");
deviceRequired("Composition listing (remotion compositions)", "butuh Chromium ARM64 di Debian proot. Jalankan `npm run compositions` di /opt/binb setelah instalasi.");
deviceRequired("binb test (render+TTS+mix end-to-end)", "butuh Kokoro+Chromium ARM64. Jalankan `binb test` di HP setelah install.sh.");

// ================= runner =================
tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "binb-tests-"));
let pass = 0, failCount = 0;
for (const t of results) {
  try { await t.fn(); console.log(`[PASS] ${t.name}`); pass++; }
  catch (e) { console.error(`[FAIL] ${t.name}\n       ${e.message.replace(/\n/g, "\n       ")}`); failCount++; }
}
console.log(`\n${pass} pass, ${failCount} fail`);
console.log("\nDEVICE VERIFICATION REQUIRED (tidak bisa diuji di sandbox, HARUS diuji di HP):");
for (const d of deviceOnly) console.log(`  [DEVICE] ${d.name} - ${d.reason}`);
fs.rmSync(tmpRoot, {recursive: true, force: true});
process.exit(failCount === 0 ? 0 : 1);
