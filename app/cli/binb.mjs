#!/usr/bin/env node
/**
 * binb - Better in Brief production CLI.
 * Berjalan di Debian proot (Node 20). Wrapper Termux otomatis masuk ke Debian.
 * Single source of truth: episode.locked.json. Tidak ada upload otomatis.
 */
import fs from "node:fs";
import path from "node:path";
import {P, SYSTEM_DIR, homeDir, freeGb, gitInfo, loadConfig, readJson, sha256File, toolVersion, writeJson, log, fail} from "./lib/util.mjs";
import {validateEpisode} from "../pipeline/validate.mjs";
import {lockEpisode, lockedCoreSha} from "../pipeline/lock.mjs";
import {runTts} from "../pipeline/tts.mjs";
import {compileEpisode} from "../pipeline/compile.mjs";
import {renderEpisode} from "../pipeline/render.mjs";
import {mixEpisode} from "../pipeline/mix.mjs";
import {encodeEpisode} from "../pipeline/encode.mjs";
import {runQc} from "../qc/run-qc.mjs";
import {packageEpisode} from "../pipeline/package.mjs";
import {migrateOld} from "../pipeline/migrate.mjs";
import {doctor} from "./lib/doctor.mjs";
import {newEpisode, clean, archiveEpisode, diagnose} from "./lib/misc.mjs";

const PIPELINE_VERSION = "1.0.0";

function versionOf(pkg) {
  try {
    const lock = readJson(path.join(SYSTEM_DIR, "package-lock.json"));
    return (lock.packages && lock.packages[`node_modules/${pkg}`] || {}).version || null;
  } catch { return null; }
}

function preflight({heavy = true} = {}) {
  const limits = loadConfig("limits");
  const home = homeDir();
  for (const d of ["episodes", "work", "publish", "archive", "logs"]) {
    fs.mkdirSync(path.join(home, d), {recursive: true});
  }
  const free = freeGb(home);
  if (free !== null) {
    console.log(`Storage: ${free.toFixed(1)} GB kosong. Estimasi kebutuhan build: ~2-4 GB (render + mix + encode).`);
    if (free < limits.storage.warnFreeGb) console.warn(`PERINGATAN: ruang kosong < ${limits.storage.warnFreeGb} GB. Jalankan binb clean atau kosongkan storage.`);
    if (heavy && free < limits.storage.stopFreeGb) {
      throw new Error(`Ruang kosong ${free.toFixed(1)} GB < batas keras ${limits.storage.stopFreeGb} GB. Render dibatalkan demi keselamatan data.`);
    }
  }
}

function cmdValidate(id) {
  const {errors, warnings} = validateEpisode(readJson(P.episodeJson(id)));
  warnings.forEach((w) => console.warn(`[WARN] ${w}`));
  if (errors.length) fail(`Episode ${id} TIDAK valid:\n- ${errors.join("\n- ")}`);
  console.log(`Episode ${id} valid.`);
}

function buildManifestFor(id, lockRes, stages) {
  const audioCfg = loadConfig("audio");
  const enc = loadConfig("platforms").encode;
  const voices = loadConfig("voices");
  const locked = readJson(P.lockedJson(id));
  const assetsDir = path.join(SYSTEM_DIR, "assets");
  const assetHashes = {};
  const walk = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, {withFileTypes: true})) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else assetHashes[path.relative(SYSTEM_DIR, full)] = sha256File(full);
    }
  };
  walk(path.join(assetsDir, "fonts"));
  walk(path.join(assetsDir, "logos"));
  return {
    episodeId: id,
    schemaVersion: locked.schemaVersion,
    lockedSha256: lockRes.sha256,
    pipelineVersion: PIPELINE_VERSION,
    versions: {
      remotion: versionOf("remotion"),
      node: process.versions.node,
      chromium: toolVersion(process.env.BINB_CHROMIUM || "/usr/bin/chromium", ["--version"]),
      ffmpeg: toolVersion("ffmpeg", ["-version"]),
      python: toolVersion("python3", ["--version"]),
      kokoro: voices.modelVersion,
    },
    builtAt: new Date().toISOString(),
    audioPolicy: {targetIntegratedLufs: audioCfg.integratedLoudnessTargetLufs, truePeakMaxDbtp: audioCfg.truePeakMaxDbtp, source: "config/audio.json"},
    encoderSettings: enc,
    sourceAssetHashes: assetHashes,
    git: gitInfo(),
    stages,
  };
}

function cmdBuild(id, flags) {
  const stages = {};
  const t0 = Date.now();
  const stage = (name, fn) => {
    const s = Date.now();
    console.log(`\n== [${name}] ==`);
    const out = fn();
    stages[name] = {ok: true, seconds: Math.round((Date.now() - s) / 100) / 10};
    return out;
  };
  stage("01-preflight", () => preflight({heavy: true}));
  stage("02-validate", () => cmdValidate(id));
  const lockRes = stage("03-lock", () => lockEpisode(id, {forceRelock: flags.includes("--force-relock")}));
  const tts = stage("04-tts", () => runTts(id));
  stage("05-audio-probe", () => {
    console.log(tts.scenes.map((s) => `${s.sceneId}: ${s.durationSec.toFixed(2)}s @${s.sampleRate}Hz peak ${s.peakDb}dB${s.generated ? "" : " (cache)"}`).join("\n"));
  });
  stage("06-compile", () => compileEpisode(id, tts));
  stage("07-render", () => renderEpisode(id));
  stage("08-mix", () => mixEpisode(id));
  stage("09-encode", () => encodeEpisode(id));
  const qc = stage("10-12-qc", () => runQc(id)); // technical + visual + semantic
  const manifest = buildManifestFor(id, lockRes, stages);
  writeJson(path.join(P.work(id), "build-manifest.json"), manifest);
  const pack = stage("13-14-package", () => packageEpisode(id, manifest));
  console.log(`\nBUILD SELESAI dalam ${Math.round((Date.now() - t0) / 1000)}s`);
  console.log(`QC: ${qc.verdict}. Publish Ready: ${pack.pubDir}`);
  console.log("Upload manual ke YouTube Shorts / IG Reels / TikTok - lihat publishing-copy.json.");
}

function cmdTest() {
  // Smoke test end-to-end 3-5 detik dengan music fixture silent.
  const id = "SmokeTest_000";
  const dir = P.episodes(id);
  preflight({heavy: true});
  fs.mkdirSync(path.join(dir, "sources"), {recursive: true});
  const episode = readJson(path.join(SYSTEM_DIR, "examples", "Example_001", "episode.json"));
  const smoke = {
    ...episode, episodeId: id, title: "BinB smoke test",
    scenes: [
      {...episode.scenes[0], narration: "Smoke test.", visual: {...episode.scenes[0].visual, headline: "smoke test scene"}},
      {...episode.scenes[2], id: "S02", narration: "One data point."},
      {...episode.scenes[3], id: "S03", narration: "One outcome."},
      {...episode.scenes[4], id: "S04", narration: "Big ideas."},
    ],
    packaging: {youtubeTitle: "smoke", instagramCaption: "smoke", tiktokCaption: "smoke", hashtags: []},
  };
  writeJson(path.join(dir, "episode.json"), smoke);
  fs.writeFileSync(path.join(dir, "sources", "smoke-evidence.txt"), "fixture evidence untuk smoke test\n");
  fs.rmSync(P.lockedJson(id), {force: true});
  cmdBuild(id, ["--force-relock"]);
  console.log("\nSMOKE TEST LULUS: pipeline TTS->render->mix->encode->QC->package bekerja di perangkat ini.");
}

const HELP = `binb - Better in Brief production system v${PIPELINE_VERSION}

Perintah:
  binb doctor                 Periksa kesehatan environment
  binb test                   Smoke test end-to-end (video pendek)
  binb new <id>               Buat episode baru dari template
  binb validate <id>          Validasi episode.json
  binb lock <id>              Kunci episode -> episode.locked.json (+hash)
  binb build <id>             Pipeline penuh sampai Publish Ready
  binb render <id>            Render ulang dari locked (butuh compile sebelumnya)
  binb qc <id>                Jalankan ulang QC
  binb package <id>           Paketkan hasil yang sudah lolos QC
  binb migrate <folder>       Rencana migrasi sistem lama (dry-run; --apply untuk eksekusi)
  binb clean                  Bersihkan cache aman (episode & publish tidak disentuh)
  binb archive <id>           Salin paket publish ke archive/
  binb diagnose               Buat laporan debug yang aman dibagikan
  binb version | binb help

Lokasi kerja: ${homeDir()} (override dengan BINB_HOME)
Upload tetap manual - sistem ini tidak pernah mengunggah ke platform.`;

async function main() {
  const [cmd, arg, ...rest] = process.argv.slice(2);
  const flags = [arg, ...rest].filter((a) => a && a.startsWith("--"));
  try {
    switch (cmd) {
      case "help": case undefined: console.log(HELP); break;
      case "version": console.log(`binb ${PIPELINE_VERSION} (remotion ${versionOf("remotion") || "?"}, node ${process.versions.node})`); break;
      case "doctor": process.exit(doctor() ? 0 : 1); break;
      case "test": cmdTest(); break;
      case "new": if (!arg) fail("binb new <episode-id>"); newEpisode(arg); break;
      case "validate": if (!arg) fail("binb validate <episode-id>"); cmdValidate(arg); break;
      case "lock": if (!arg) fail("binb lock <episode-id>"); {
        const r = lockEpisode(arg, {forceRelock: flags.includes("--force-relock")});
        console.log(`Locked: ${r.path}\nsha256: ${r.sha256}`);
      } break;
      case "build": if (!arg || arg.startsWith("--")) fail("binb build <episode-id>"); cmdBuild(arg, flags); break;
      case "render": if (!arg) fail("binb render <episode-id>"); preflight({heavy: true}); console.log(JSON.stringify(renderEpisode(arg), null, 2)); break;
      case "qc": if (!arg) fail("binb qc <episode-id>"); {
        const rep = runQc(arg);
        console.log(fs.readFileSync(path.join(P.work(arg), "qc-summary.txt"), "utf8"));
        process.exit(rep.verdict === "PASS" ? 0 : 1);
      } break;
      case "package": if (!arg) fail("binb package <episode-id>"); {
        const locked = readJson(P.lockedJson(arg));
        const manifest = buildManifestFor(arg, {sha256: lockedCoreSha(locked)}, {note: "package-only rerun"});
        console.log(JSON.stringify(packageEpisode(arg, manifest).files, null, 2));
      } break;
      case "migrate": if (!arg || arg.startsWith("--")) fail("binb migrate <old-folder> [--apply]"); migrateOld(arg, {apply: flags.includes("--apply")}); break;
      case "clean": clean(); break;
      case "archive": if (!arg) fail("binb archive <episode-id>"); archiveEpisode(arg); break;
      case "diagnose": diagnose(); break;
      default: fail(`Perintah tidak dikenal: ${cmd}\n\n${HELP}`);
    }
  } catch (e) {
    log(`ERROR: ${e.message}`);
    fail(e.message);
  }
}
main();
