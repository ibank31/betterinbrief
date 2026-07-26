import fs from "node:fs";
import path from "node:path";

const HOME = process.env.BINB_HOME || "/sdcard/BinB_Studio/BetterInBrief";
const APP = process.env.BINB_APP_ROOT || "/opt/binb";
const episodeId = process.argv[2];
const force = process.argv.includes("--force");
if (!episodeId) { console.error("Pakai: node tools/assets-fetch.mjs <episodeId> [--force]"); process.exit(1); }

const epDir = path.join(HOME, "episodes", episodeId);
const episode = JSON.parse(fs.readFileSync(path.join(epDir, "episode.json"), "utf8"));
const assetsDir = path.join(epDir, "assets");
const publicDir = path.join(APP, "app", "remotion", "public", "assets", episodeId);
fs.mkdirSync(assetsDir, {recursive: true});
fs.mkdirSync(publicDir, {recursive: true});

const keysPath = path.join(HOME, "tools", "assets-keys.json");
const keys = fs.existsSync(keysPath) ? JSON.parse(fs.readFileSync(keysPath, "utf8")) : {};

// Semua URL API dirakit lewat konkatenasi agar aman dari korupsi transport.
const HTTPS = "https:";
const PEXELS_VIDEO_SEARCH = HTTPS + "//api.pexels.com/videos/search?orientation=portrait&per_page=15&query=";
const PEXELS_PHOTO_SEARCH = HTTPS + "//api.pexels.com/v1/search?orientation=portrait&per_page=20&query=";
const PEXELS_LICENSE = HTTPS + "//www.pexels.com/license/";
const POLLINATIONS_PROMPT = HTTPS + "//image.pollinations.ai/prompt/";
const MODELSCOPE_BASE = HTTPS + "//api-inference.modelscope.ai";

const hashKey = (value) => {
  let h = 5381;
  for (let i = 0; i < value.length; i += 1) h = ((h * 33) ^ value.charCodeAt(i)) >>> 0;
  return h;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function download(url, headers) {
  const res = await fetch(url, {headers});
  if (!res.ok) throw new Error("HTTP " + res.status + " untuk " + url);
  return Buffer.from(await res.arrayBuffer());
}

async function fetchPexels(spec, pickSeed) {
  const key = (keys.pexelsApiKey || "").trim();
  if (!key || key.startsWith("TEMPEL")) throw new Error("pexelsApiKey belum diisi di tools/assets-keys.json (daftar gratis: pexels.com/api)");
  const headers = {Authorization: key};
  if (spec.type === "video") {
    const url = PEXELS_VIDEO_SEARCH + encodeURIComponent(spec.query);
    const data = await (await fetch(url, {headers})).json();
    const vids = (data.videos || []).filter((v) => v.duration >= 8);
    if (!vids.length) throw new Error("Pexels: tidak ada video portrait >= 8s untuk query: " + spec.query);
    const vid = vids[pickSeed % vids.length];
    const files = (vid.video_files || []).filter((f) => f.height >= 1200 && f.height <= 2200).sort((a, b) => a.height - b.height);
    const file = files[0] || vid.video_files[0];
    return {buffer: await download(file.link, headers), sourceUrl: vid.url, license: PEXELS_LICENSE};
  }
  const url = PEXELS_PHOTO_SEARCH + encodeURIComponent(spec.query);
  const data = await (await fetch(url, {headers})).json();
  const photos = data.photos || [];
  if (!photos.length) throw new Error("Pexels: tidak ada foto untuk query: " + spec.query);
  const photo = photos[pickSeed % photos.length];
  return {buffer: await download(photo.src.large2x, headers), sourceUrl: photo.url, license: PEXELS_LICENSE};
}

async function fetchPollinations(spec, pickSeed) {
  const seed = spec.seed ?? (pickSeed % 100000);
  let url = POLLINATIONS_PROMPT + encodeURIComponent(spec.prompt) + "?width=1080&height=1920&nologo=true&seed=" + seed;
  const key = (keys.pollinationsKey || "").trim();
  if (key) url += "&key=" + key;
  return {buffer: await download(url), sourceUrl: "pollinations.ai seed " + seed, license: "ai_generated"};
}

// ModelScope API-Inference (kuota gratis harian, reset 24 jam; async task + polling).
// Terbukti hidup 26 Jul 2026: Qwen/Qwen-Image 768x1344 selesai ~50 detik.
async function fetchModelScope(spec, pickSeed) {
  const key = (keys.modelscopeApiKey || "").trim();
  if (!key || key.startsWith("TEMPEL")) throw new Error("modelscopeApiKey belum diisi di tools/assets-keys.json (token gratis: modelscope.ai -> Access Token, wajib binding Alibaba Cloud)");
  const jsonHeaders = {Authorization: "Bearer " + key, "Content-Type": "application/json"};
  const seed = spec.seed ?? (pickSeed % 2147483647);
  const body = {
    model: spec.model || "Qwen/Qwen-Image",
    prompt: spec.prompt,
    size: spec.size || "768x1344",
    seed,
  };
  if (spec.negativePrompt) body.negative_prompt = spec.negativePrompt;
  if (spec.steps) body.steps = spec.steps;
  const post = await fetch(MODELSCOPE_BASE + "/v1/images/generations", {
    method: "POST",
    headers: {...jsonHeaders, "X-ModelScope-Async-Mode": "true"},
    body: JSON.stringify(body),
  });
  if (!post.ok) throw new Error("ModelScope HTTP " + post.status + ": " + (await post.text()).slice(0, 300));
  const taskId = (await post.json()).task_id;
  if (!taskId) throw new Error("ModelScope: respons tanpa task_id");
  for (let i = 0; i < 40; i += 1) {
    await sleep(5000);
    const res = await fetch(MODELSCOPE_BASE + "/v1/tasks/" + taskId, {
      headers: {...jsonHeaders, "X-ModelScope-Task-Type": "image_generation"},
    });
    if (!res.ok) throw new Error("ModelScope poll HTTP " + res.status);
    const data = await res.json();
    if (data.task_status === "SUCCEED") {
      const imageUrl = (data.output_images || [])[0];
      if (!imageUrl) throw new Error("ModelScope: SUCCEED tanpa output_images");
      return {buffer: await download(imageUrl), sourceUrl: "modelscope " + body.model + " seed " + seed, license: "ai_generated"};
    }
    if (data.task_status === "FAILED") throw new Error("ModelScope: task " + taskId + " FAILED");
  }
  throw new Error("ModelScope: timeout 200s menunggu task " + taskId);
}

const manifestPath = path.join(assetsDir, "assets-manifest.json");
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {episodeId, entries: []};

let fetched = 0;
let skipped = 0;
const errors = [];
for (const scene of episode.scenes || []) {
  for (const asset of scene.visualAssets || []) {
    if (!asset.fetch || !asset.file) continue;
    const base = asset.file.replace(/^assets\//, "");
    const target = path.join(assetsDir, base);
    if (fs.existsSync(target) && !force) { skipped += 1; continue; }
    const pickSeed = hashKey(episodeId + ":" + scene.id + ":" + asset.assetId);
    try {
      const spec = asset.fetch;
      const result = spec.provider === "pexels" ? await fetchPexels(spec, pickSeed)
        : spec.provider === "pollinations" ? await fetchPollinations(spec, pickSeed)
        : spec.provider === "modelscope" ? await fetchModelScope(spec, pickSeed)
        : null;
      if (!result) throw new Error("provider tidak dikenal: " + spec.provider);
      fs.writeFileSync(target, result.buffer);
      manifest.entries = manifest.entries.filter((e) => !(e.assetId === asset.assetId && e.sceneId === scene.id));
      manifest.entries.push({sceneId: scene.id, assetId: asset.assetId, file: asset.file, provider: spec.provider, sourceUrl: result.sourceUrl, license: result.license, bytes: result.buffer.length, fetchedAt: new Date().toISOString()});
      console.log("FETCH " + scene.id + " " + asset.assetId + " -> " + base + " (" + result.buffer.length + " byte)");
      fetched += 1;
    } catch (err) {
      errors.push(scene.id + " " + asset.assetId + ": " + err.message);
    }
  }
}
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

// Sinkronkan SEMUA isi assets/ (termasuk drop manual, mis. hero Luma) ke public renderer.
let synced = 0;
for (const name of fs.readdirSync(assetsDir)) {
  const src = path.join(assetsDir, name);
  if (!fs.statSync(src).isFile() || name === "assets-manifest.json") continue;
  fs.copyFileSync(src, path.join(publicDir, name));
  synced += 1;
}
console.log("Selesai: " + fetched + " diunduh, " + skipped + " dari cache, " + synced + " file sinkron ke public/assets/" + episodeId);
if (errors.length) {
  console.error("GAGAL:");
  for (const e of errors) console.error("- " + e);
  process.exit(1);
}
