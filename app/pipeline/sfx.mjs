import fs from "node:fs";
import path from "node:path";
import {P, loadConfig, readJson, runOk, sha256File, writeJson, log} from "../cli/lib/util.mjs";

// v1.6a SFX sintetis: whoosh (cut antar-scene), tick+impact (count-up hook).
// Semua suara disintesis ffmpeg di runner — nol aset eksternal, nol rantai
// lisensi (CC0 by construction), deterministik (seed tetap, plan diturunkan
// dari render-props). Kebijakan gain/duck ada di config/audio.json (single
// source), bukan hardcode di file ini.

// PURE + DETERMINISTIC: scenes (render-props) + fps -> daftar event SFX.
export function buildSfxPlan(scenes, fps) {
  const events = [];
  for (let i = 1; i < scenes.length; i++) {
    const s = scenes[i];
    if (s.type === "closing_brand") continue; // doktrin: penutup tenang, tanpa whoosh
    // Whoosh mulai 7 frame sebelum cut agar puncak swell jatuh tepat di cut.
    events.push({type: "whoosh", sceneId: s.id, frame: Math.max(0, s.timing.from - 7)});
  }
  for (const s of scenes) {
    if (s.type !== "hook") continue;
    const stat = s.visual && typeof s.visual.statistic === "string" ? s.visual.statistic : "";
    if (!/^\d/.test(stat)) continue;
    // Count-up HookScene: frame 0..38 (ease-out kuadratik). Tick mengikuti
    // ramp, impact saat angka mendarat di frame 38. Sinkron manual dengan
    // HookScene.tsx — bila window count-up berubah, ubah di sini juga.
    for (const f of [4, 10, 16, 22, 28, 34]) events.push({type: "tick", sceneId: s.id, frame: s.timing.from + f});
    events.push({type: "impact", sceneId: s.id, frame: s.timing.from + 38});
  }
  events.sort((a, b) => a.frame - b.frame || (a.type < b.type ? -1 : 1));
  return events.map((e) => ({...e, atSec: Math.round((e.frame / fps) * 1000) / 1000}));
}

function synthPalette(dir) {
  const wav = (name) => path.join(dir, name + ".wav");
  // Whoosh: pink noise swell ter-band-pass, fade-in lalu fade-out.
  runOk("ffmpeg", ["-y", "-v", "error",
    "-f", "lavfi", "-i", "anoisesrc=r=48000:c=pink:a=0.7:d=0.5:seed=7",
    "-af", "highpass=f=180,lowpass=f=1600,afade=t=in:st=0:d=0.22:curve=qsin,afade=t=out:st=0.22:d=0.28:curve=qsin",
    "-ac", "1", "-c:a", "pcm_s16le", wav("whoosh")]);
  // Impact: sine rendah 68 Hz decay cepat + transient noise pendek.
  runOk("ffmpeg", ["-y", "-v", "error",
    "-f", "lavfi", "-i", "sine=r=48000:f=68:d=0.5",
    "-f", "lavfi", "-i", "anoisesrc=r=48000:c=white:a=0.4:d=0.07:seed=11",
    "-filter_complex", "[0:a]volume=-4dB,afade=t=out:st=0.03:d=0.45[low];[1:a]lowpass=f=3200,afade=t=out:st=0:d=0.07[cl];[low][cl]amix=inputs=2:duration=first:normalize=0[out]",
    "-map", "[out]", "-ac", "1", "-c:a", "pcm_s16le", wav("impact")]);
  // Tick: sine 1.7 kHz sangat pendek, decay instan.
  runOk("ffmpeg", ["-y", "-v", "error",
    "-f", "lavfi", "-i", "sine=r=48000:f=1700:d=0.06",
    "-af", "volume=-6dB,afade=t=out:st=0.005:d=0.05",
    "-ac", "1", "-c:a", "pcm_s16le", wav("tick")]);
  return {whoosh: wav("whoosh"), impact: wav("impact"), tick: wav("tick")};
}

// Rakit track SFX satu file sepanjang timeline; null bila SFX mati/tanpa event.
export function renderSfxTrack(id) {
  const audioCfg = loadConfig("audio");
  const sfxCfg = audioCfg.sfx;
  if (!sfxCfg || sfxCfg.enabled === false) return null;
  const workDir = P.work(id);
  const props = readJson(path.join(workDir, "render-props.json"));
  const fps = loadConfig("brand").canvas.fps;
  const events = buildSfxPlan(props.scenes, fps);
  if (!events.length) return null;
  const dir = path.join(workDir, "sfx");
  fs.mkdirSync(dir, {recursive: true});
  const palette = synthPalette(dir);
  const gains = sfxCfg.eventGainDb || {};
  const args = ["-y", "-v", "error"];
  const chains = [];
  events.forEach((e, i) => {
    args.push("-i", palette[e.type]);
    const ms = Math.max(0, Math.round(e.atSec * 1000));
    const gain = typeof gains[e.type] === "number" ? gains[e.type] : 0;
    chains.push("[" + i + ":a]adelay=" + ms + ":all=1,volume=" + gain + "dB[e" + i + "]");
  });
  const labels = events.map((_, i) => "[e" + i + "]").join("");
  const graph = chains.join(";") + ";" + labels + "amix=inputs=" + events.length + ":duration=longest:normalize=0[out]";
  const track = path.join(dir, "sfx-track.wav");
  args.push("-filter_complex", graph, "-map", "[out]",
    "-ar", String(audioCfg.sampleRate), "-ac", String(audioCfg.channels), "-c:a", "pcm_s24le", track);
  runOk("ffmpeg", args);
  const manifest = {episodeId: id, eventCount: events.length, events, trackSha256: sha256File(track)};
  writeJson(path.join(dir, "sfx-manifest.json"), manifest);
  log("sfx: " + id + " " + events.length + " event (whoosh/tick/impact) -> sfx-track.wav");
  return {track, manifest};
}
