import fs from "node:fs";
import path from "node:path";
import {P, SYSTEM_DIR, loadConfig, readJson, sha256File, writeJson, runOk, ffprobeJson, log} from "../cli/lib/util.mjs";

const CHROMIUM = process.env.BINB_CHROMIUM || "/usr/bin/chromium";
// Ten seconds at BinB's current 30fps. Short enough to resume after a tab crash,
// long enough that bundling/concatenation overhead remains small on a phone.
const CHUNK_FRAMES = 300;
const RENDER_TIMEOUT_MS = 300000;
const CHUNK_ATTEMPTS = 2;
const RENDER_CACHE_VERSION = "chunked-v1";

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

function chunkPlan(frameCount) {
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

function renderChunk({id, propsPath, chunkPath, start, end}) {
  const args = [
    "remotion", "render", "app/remotion/src/index.ts", "Episode", chunkPath,
    `--props=${propsPath}`,
    `--frames=${start}-${end}`,
    "--concurrency=1",
    "--gl=swiftshader",
    "--crf=14",
    `--timeout=${RENDER_TIMEOUT_MS}`,
    "--log=warn",
  ];
  if (fs.existsSync(CHROMIUM)) args.push(`--browser-executable=${CHROMIUM}`);

  for (let attempt = 1; attempt <= CHUNK_ATTEMPTS; attempt++) {
    try {
      log(`render: ${id} chunk ${start}-${end} (percobaan ${attempt}/${CHUNK_ATTEMPTS})`);
      runOk("npx", args, {cwd: SYSTEM_DIR, stdio: ["ignore", "inherit", "pipe"]});
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

export function renderEpisode(id) {
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
  const compatible = previous
    && previous.propsSha256 === state.propsSha256
    && previous.frameCount === state.frameCount
    && previous.chunkFrames === state.chunkFrames
    && previous.renderer?.version === state.renderer.version;
  if (!compatible) {
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
    renderChunk({id, propsPath, chunkPath, start: chunk.start, end: chunk.end});
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
