import fs from "node:fs";
import path from "node:path";
import {spawn} from "node:child_process";
import {P, SYSTEM_DIR, loadConfig, readJson, sha256File, writeJson, runOk, ffprobeJson, log} from "../cli/lib/util.mjs";

const CHROMIUM = process.env.BINB_CHROMIUM || "/usr/bin/chromium";
// Ten seconds at BinB's current 30fps. Short enough to resume after a tab crash,
// long enough that bundling/concatenation overhead remains small on a phone.
const CHUNK_FRAMES = 300;
const RENDER_TIMEOUT_MS = 300000;
const CHUNK_ATTEMPTS = 2;
const RENDER_CACHE_VERSION = "chunked-v1";
// A renderer tab that is alive but no longer producing output is more useful
// to diagnose as a failed chunk than as a five-minute opaque timeout.
const HEALTH_WARN_MS = 45000;
const HEALTH_STALL_MS = 120000;

function copySceneAudio(id, props, workDir) {
  const publicAudio = path.join(SYSTEM_DIR, "app", "remotion", "public", "audio", props.episodeId);
  fs.rmSync(publicAudio, {recursive: true, force: true});
  fs.mkdirSync(publicAudio, {recursive: true});
  for (const scene of props.scenes) {
    const src = path.join(workDir, "audio", `${scene.id}.wav`);
    if (!fs.existsSync(src)) throw new Error(`Audio TTS hilang: ${src}`);
    fs.copyFileSync(src, path.join(publicAudio, `${scene.id}.wav`));
  }
}

function totalFrames(props) {
  const frames = props.scenes.reduce((sum, scene) => sum + Number(scene.timing?.durationInFrames || 0), 0);
  if (!Number.isInteger(frames) || frames <= 0) {
    throw new Error("render-props tidak memiliki durasi scene yang valid");
  }
  return frames;
}

export function chunkPlan(frameCount) {
  const chunks = [];
  for (let start = 0, index = 1; start < frameCount; start += CHUNK_FRAMES, index++) {
    chunks.push({
      index,
      start,
      end: Math.min(start + CHUNK_FRAMES - 1, frameCount - 1),
      file: `chunk-${String(index).padStart(3, "0")}-${start}-${Math.min(start + CHUNK_FRAMES - 1, frameCount - 1)}.mp4`,
    });
  }
  return chunks;
}

export function chunkCacheStatus({previous, state, chunkDir}) {
  const compatible = previous
    && previous.propsSha256 === state.propsSha256
    && previous.frameCount === state.frameCount
    && previous.chunkFrames === state.chunkFrames
    && previous.renderer?.version === state.renderer.version;
  const validChunks = compatible
    ? state.chunks.filter((chunk) => isUsableChunk(path.join(chunkDir, chunk.file))).map((chunk) => chunk.file)
    : [];
  return {compatible: Boolean(compatible), validChunks};
}

function isUsableChunk(file) {
  if (!fs.existsSync(file) || fs.statSync(file).size < 4096) return false;
  try {
    const probe = ffprobeJson(file);
    const hasVideo = probe.streams.some((stream) => stream.codec_type === "video");
    const hasAudio = probe.streams.some((stream) => stream.codec_type === "audio");
    return hasVideo && hasAudio && Number(probe.format.duration) > 0;
  } catch {
    return false;
  }
}

function safelyRemove(file) {
  fs.rmSync(file, {force: true});
}

function writeChunkState(statePath, state) {
  writeJson(statePath, {...state, updatedAt: new Date().toISOString()});
}

async function runRemotionWithHealthGuard(args, label) {
  await new Promise((resolve, reject) => {
    const child = spawn("npx", args, {cwd: SYSTEM_DIR, stdio: ["ignore", "pipe", "pipe"]});
    let lastOutputAt = Date.now();
    let warned = false;
    let finished = false;
    let stderr = "";
    const relay = (chunk) => {
      lastOutputAt = Date.now();
      process.stdout.write(chunk);
    };
    child.stdout.on("data", relay);
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
      if (stderr.length > 8000) stderr = stderr.slice(-8000);
      relay(chunk);
    });
    const health = setInterval(() => {
      const quietFor = Date.now() - lastOutputAt;
      if (quietFor >= HEALTH_STALL_MS) {
        log(`render: HEALTH GUARD menghentikan ${label}; tidak ada output selama ${Math.round(quietFor / 1000)}s`);
        child.kill("SIGTERM");
      } else if (!warned && quietFor >= HEALTH_WARN_MS) {
        warned = true;
        log(`render: HEALTH GUARD peringatan ${label}; tidak ada output selama ${Math.round(quietFor / 1000)}s`);
      }
    }, 5000);
    const finish = () => { finished = true; clearInterval(health); };
    child.on("error", (error) => { finish(); reject(error); });
    child.on("close", (code, signal) => {
      finish();
      if (code === 0) resolve();
      else reject(new Error(`Remotion ${label} berhenti (code=${code}, signal=${signal || "-"}). ${stderr.slice(-4000)}`));
    });
  });
}

async function renderChunk({id, propsPath, chunkPath, start, end}) {
  const args = [
    "remotion", "render", "app/remotion/src/index.ts", "Episode", chunkPath,
    `--props=${propsPath}`,
    `--frames=${start}-${end}`,
    "--concurrency=1",
    "--gl=swiftshader",
    "--crf=14",
    `--timeout=${RENDER_TIMEOUT_MS}`,
    "--log=verbose",
  ];
  if (fs.existsSync(CHROMIUM)) args.push(`--browser-executable=${CHROMIUM}`);

  for (let attempt = 1; attempt <= CHUNK_ATTEMPTS; attempt++) {
    try {
      log(`render: ${id} chunk ${start}-${end} (percobaan ${attempt}/${CHUNK_ATTEMPTS})`);
      await runRemotionWithHealthGuard(args, `${id} chunk ${start}-${end}`);
      if (!isUsableChunk(chunkPath)) throw new Error(`chunk ${start}-${end} selesai tetapi output tidak valid`);
      return;
    } catch (error) {
      safelyRemove(chunkPath);
      if (attempt >= CHUNK_ATTEMPTS) throw error;
      log(`render: chunk ${start}-${end} gagal; mengulang chunk ini saja...`);
    }
  }
}

function concatChunks(chunkPaths, outputPath, fps) {
  const listPath = `${outputPath}.concat.txt`;
  const tempOutput = `${outputPath}.partial.mp4`;
  const quote = (file) => file.replace(/'/g, "'\\''");
  fs.writeFileSync(listPath, chunkPaths.map((file) => `file '${quote(file)}'`).join("\n") + "\n");
  safelyRemove(tempOutput);
  try {
    runOk("ffmpeg", [
      "-y", "-v", "error",
      "-f", "concat", "-safe", "0", "-i", listPath,
      // Each independent MP4 chunk carries a small audio/container timestamp
      // offset. Stream-copy concatenation preserves those offsets and makes a
      // 30fps sequence appear as ~29.86fps to ffprobe. Rebuild video PTS from
      // its frame index here; this is cheap compared with Remotion rendering
      // and preserves the exact expected number of visual frames.
      "-map", "0:v:0", "-map", "0:a:0",
      "-vf", `setpts=N/(${fps}*TB)`, "-r", String(fps),
      "-c:v", "libx264", "-crf", "14", "-pix_fmt", "yuv420p",
      "-c:a", "copy", "-movflags", "+faststart", tempOutput,
    ]);
    if (!isUsableChunk(tempOutput)) throw new Error("hasil gabungan chunk tidak valid");
    fs.renameSync(tempOutput, outputPath);
  } finally {
    safelyRemove(tempOutput);
    safelyRemove(listPath);
  }
}

export async function renderEpisode(id) {
  const workDir = P.work(id);
  const propsPath = path.join(workDir, "render-props.json");
  if (!fs.existsSync(propsPath)) throw new Error(`render-props.json belum ada. Jalankan compile dulu (binb build ${id}).`);
  const props = readJson(propsPath);
  const propsSha256 = sha256File(propsPath);
  const frameCount = totalFrames(props);
  const fps = loadConfig("brand").canvas.fps;
  const plan = chunkPlan(frameCount);

  copySceneAudio(id, props, workDir);

  const outDir = path.join(workDir, "render");
  const chunkDir = path.join(outDir, "chunks");
  const statePath = path.join(chunkDir, "chunk-manifest.json");
  const mezzanine = path.join(outDir, "mezzanine.mp4");
  fs.mkdirSync(chunkDir, {recursive: true});

  const state = {
    episodeId: props.episodeId,
    propsSha256,
    frameCount,
    chunkFrames: CHUNK_FRAMES,
    renderer: {version: RENDER_CACHE_VERSION, chromium: fs.existsSync(CHROMIUM) ? CHROMIUM : "(bundled)", gl: "swiftshader", crf: 14},
    chunks: plan,
  };
  const previous = fs.existsSync(statePath) ? readJson(statePath) : null;
  const cache = chunkCacheStatus({previous, state, chunkDir});
  if (!cache.compatible) {
    fs.rmSync(chunkDir, {recursive: true, force: true});
    fs.mkdirSync(chunkDir, {recursive: true});
    log(`render: cache chunk ${id} tidak cocok; memulai set chunk baru (${plan.length} bagian)`);
  } else {
    log(`render: melanjutkan cache chunk ${id}; chunk valid akan dilewati`);
  }
  writeChunkState(statePath, state);

  for (const chunk of plan) {
    const chunkPath = path.join(chunkDir, chunk.file);
    if (isUsableChunk(chunkPath)) {
      log(`render: chunk ${chunk.start}-${chunk.end} cache hit`);
      continue;
    }
    await renderChunk({id, propsPath, chunkPath, start: chunk.start, end: chunk.end});
    writeChunkState(statePath, state);
  }

  const chunkPaths = plan.map((chunk) => path.join(chunkDir, chunk.file));
  log(`render: menggabungkan ${chunkPaths.length} chunk menjadi mezzanine.mp4`);
  concatChunks(chunkPaths, mezzanine, fps);

  const manifest = {
    episodeId: props.episodeId,
    renderedAt: new Date().toISOString(),
    entry: "app/remotion/src/index.ts",
    composition: "Episode",
    propsFile: propsPath,
    propsSha256,
    frameCount,
    chunkFrames: CHUNK_FRAMES,
    chunkCount: plan.length,
    chunkManifest: statePath,
    mezzanine,
    mezzanineSha256: sha256File(mezzanine),
    chromium: fs.existsSync(CHROMIUM) ? CHROMIUM : "(bundled)",
  };
  writeJson(path.join(workDir, "render-manifest.json"), manifest);
  return manifest;
}

export async function renderPreview(id, {sceneId, start, end} = {}) {
  const workDir = P.work(id);
  const propsPath = path.join(workDir, "render-props.json");
  if (!fs.existsSync(propsPath)) throw new Error(`render-props.json belum ada. Jalankan compile/build sebelum preview ${id}.`);
  const props = readJson(propsPath);
  const frameCount = totalFrames(props);
  const scene = sceneId ? props.scenes.find((item) => item.id === sceneId) : null;
  if (sceneId && !scene) throw new Error(`Scene ${sceneId} tidak ditemukan pada ${id}.`);
  const previewStart = start ?? scene?.timing.from ?? 0;
  const previewEnd = end ?? (scene ? scene.timing.from + scene.timing.durationInFrames - 1 : Math.min(frameCount - 1, 149));
  if (!Number.isInteger(previewStart) || !Number.isInteger(previewEnd) || previewStart < 0 || previewEnd < previewStart || previewEnd >= frameCount) {
    throw new Error(`Range preview tidak valid: ${previewStart}-${previewEnd}; episode memiliki frame 0-${frameCount - 1}.`);
  }
  copySceneAudio(id, props, workDir);
  const previewDir = path.join(workDir, "render", "previews");
  fs.mkdirSync(previewDir, {recursive: true});
  const output = path.join(previewDir, `${id}-${sceneId || "range"}-${previewStart}-${previewEnd}.mp4`);
  const args = [
    "remotion", "render", "app/remotion/src/index.ts", "Episode", output,
    `--props=${propsPath}`, `--frames=${previewStart}-${previewEnd}`,
    "--concurrency=1", "--gl=swiftshader", "--crf=16", `--timeout=${RENDER_TIMEOUT_MS}`, "--log=verbose",
  ];
  if (fs.existsSync(CHROMIUM)) args.push(`--browser-executable=${CHROMIUM}`);
  log(`preview: ${id} ${sceneId ? `scene ${sceneId}` : "range"} frame ${previewStart}-${previewEnd}`);
  await runRemotionWithHealthGuard(args, `${id} preview ${previewStart}-${previewEnd}`);
  if (!isUsableChunk(output)) throw new Error(`Preview ${id} selesai tetapi output tidak valid.`);
  const manifest = {episodeId: id, sceneId: sceneId || null, start: previewStart, end: previewEnd, output, sha256: sha256File(output), createdAt: new Date().toISOString()};
  writeJson(path.join(previewDir, "preview-manifest.json"), manifest);
  return manifest;
}
