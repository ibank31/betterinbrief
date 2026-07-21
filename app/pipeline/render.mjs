import fs from "node:fs";
import path from "node:path";
import {P, SYSTEM_DIR, readJson, sha256File, writeJson, runOk, log} from "../cli/lib/util.mjs";

const CHROMIUM = process.env.BINB_CHROMIUM || "/usr/bin/chromium";

export function renderEpisode(id) {
  const workDir = P.work(id);
  const propsPath = path.join(workDir, "render-props.json");
  if (!fs.existsSync(propsPath)) throw new Error(`render-props.json belum ada. Jalankan compile dulu (binb build ${id}).`);
  const props = readJson(propsPath);

  // Sinkronkan audio scene ke public dir Remotion.
  const publicAudio = path.join(SYSTEM_DIR, "app", "remotion", "public", "audio", props.episodeId);
  fs.rmSync(publicAudio, {recursive: true, force: true});
  fs.mkdirSync(publicAudio, {recursive: true});
  for (const scene of props.scenes) {
    const src = path.join(workDir, "audio", `${scene.id}.wav`);
    if (!fs.existsSync(src)) throw new Error(`Audio TTS hilang: ${src}`);
    fs.copyFileSync(src, path.join(publicAudio, `${scene.id}.wav`));
  }

  const outDir = path.join(workDir, "render");
  fs.mkdirSync(outDir, {recursive: true});
  const mezzanine = path.join(outDir, "mezzanine.mp4");
  const propsSha256 = sha256File(propsPath);

  const args = ["remotion", "render", "app/remotion/src/index.ts", "Episode", mezzanine,
    `--props=${propsPath}`, "--concurrency=1", "--gl=swiftshader", "--crf=14", "--timeout=300000", "--log=warn"];
  if (fs.existsSync(CHROMIUM)) args.push(`--browser-executable=${CHROMIUM}`);
  log(`render: ${id} -> mezzanine.mp4 (props sha ${propsSha256.slice(0, 12)}...)`);
  // Render bisa gagal transien di perangkat low-power (tab Chromium restart di
  // tengah render karena tekanan memori). Coba ulang sekali sebelum menyerah.
  const maxAttempts = 2;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      runOk("npx", args, {cwd: SYSTEM_DIR, stdio: ["ignore", "inherit", "pipe"]});
      break;
    } catch (error) {
      fs.rmSync(mezzanine, {force: true});
      if (attempt >= maxAttempts) throw error;
      log(`render: percobaan ${attempt} gagal, mengulang render dari awal (percobaan ${attempt + 1}/${maxAttempts})...`);
    }
  }
  if (!fs.existsSync(mezzanine)) throw new Error("Remotion selesai tetapi mezzanine.mp4 tidak ditemukan");

  const manifest = {
    episodeId: props.episodeId,
    renderedAt: new Date().toISOString(),
    entry: "app/remotion/src/index.ts", composition: "Episode",
    propsFile: propsPath, propsSha256,
    mezzanine, mezzanineSha256: sha256File(mezzanine),
    chromium: fs.existsSync(CHROMIUM) ? CHROMIUM : "(bundled)",
  };
  writeJson(path.join(workDir, "render-manifest.json"), manifest);
  return manifest;
}
