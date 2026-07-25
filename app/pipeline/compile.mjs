import path from "node:path";
import {P, loadConfig, readJson, sha256Text, canonicalJson, writeJson} from "../cli/lib/util.mjs";
import {lockedCoreSha} from "./lock.mjs";

// Split narration into caption cues (word wrap respecting max chars).
export function splitCaptions(text, maxChars) {
  const words = text.trim().split(/\s+/);
  const chunks = [];
  let current = "";
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (candidate.length > maxChars && current) { chunks.push(current); current = w; }
    else current = candidate;
    if (/[.!?]$/.test(w) && current.length > maxChars * 0.55) { chunks.push(current); current = ""; }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * PURE + DETERMINISTIC: locked JSON + tts durations (+ align manifest opsional)
 * -> render props. Dipakai oleh compile (menulis artefak) DAN oleh QC semantic
 * consistency (menurunkan ulang lalu membandingkan). Tidak boleh ada
 * timestamp/nilai acak.
 *
 * Mode caption:
 * - WORD-TIMELINE: bila alignManifest punya kata ter-timestamp untuk scene
 *   (jumlah kata cocok dengan narasi tampilan), cue dan tiap kata memakai
 *   waktu ucapan NYATA dari whisper.cpp.
 * - ESTIMASI (legacy): proporsional panjang huruf; identik dengan perilaku
 *   lama sehingga episode tanpa align-manifest tidak berubah sama sekali.
 */
export function deriveRenderProps(locked, ttsManifest, alignManifest = null) {
  const limits = loadConfig("limits");
  const brand = loadConfig("brand");
  const fps = brand.canvas.fps;
  const lockedSha = lockedCoreSha(locked);
  const durations = Object.fromEntries(ttsManifest.scenes.map((s) => [s.sceneId, s.durationSec]));
  const alignByScene = Object.fromEntries(
    ((alignManifest && alignManifest.scenes) || [])
      .filter((s) => Array.isArray(s.words) && s.words.length > 0)
      .map((s) => [s.sceneId, s.words]));

  let from = 0;
  const scenes = [];
  const captions = [];
  const errors = [];
  let alignedSceneTotal = 0;

  for (const scene of locked.scenes) {
    const speech = durations[scene.id];
    if (!Number.isFinite(speech)) { errors.push(`Durasi TTS tidak ditemukan untuk ${scene.id}`); continue; }
    if (speech < limits.scenes.minSpeechSec || speech > limits.scenes.maxSpeechSec) {
      errors.push(`${scene.id}: durasi narasi ${speech.toFixed(2)}s di luar batas ${limits.scenes.minSpeechSec}-${limits.scenes.maxSpeechSec}s`);
    }
    const isClosing = scene.type === "closing_brand";
    const durationInFrames = isClosing
      ? Math.max(brand.closing.durationFrames, Math.ceil(speech * fps))
      : Math.ceil((speech + limits.scenes.tailPadSec) * fps);
    scenes.push({
      id: scene.id, role: scene.role, type: scene.type, variant: scene.variant,
      surface: scene.surface, motion: scene.motion,
      ...(scene.visualSystem ? {visualSystem: scene.visualSystem} : {}),
      ...(scene.visualAssets ? {visualAssets: scene.visualAssets} : {}),
      narration: scene.narration,
      audio: `audio/${locked.episodeId}/${scene.id}.wav`,
      timing: {from, durationInFrames, speechSeconds: Math.round(speech * 1000) / 1000},
      visual: scene.visual,
    });

    const chunks = splitCaptions(scene.narration, limits.text.captionMaxChars);
    const speechFrames = Math.floor(speech * fps);
    const alignedWords = alignByScene[scene.id];
    const displayWordTotal = scene.narration.trim().split(/\s+/).filter(Boolean).length;

    if (alignedWords && alignedWords.length === displayWordTotal) {
      // MODE WORD-TIMELINE: cue mulai saat kata pertamanya benar-benar diucapkan.
      alignedSceneTotal += 1;
      const sceneCues = [];
      let wi = 0;
      let prevStart = from;
      for (const chunk of chunks) {
        const chunkWordTotal = chunk.trim().split(/\s+/).filter(Boolean).length;
        const cw = alignedWords.slice(wi, wi + chunkWordTotal);
        wi += chunkWordTotal;
        const startFrame = Math.max(prevStart, from + Math.round(cw[0].startSec * fps));
        sceneCues.push({chunk, cw, startFrame});
        prevStart = startFrame + 1;
      }
      sceneCues.forEach((cue, ci) => {
        const next = sceneCues[ci + 1];
        const endFrame = next ? next.startFrame : Math.max(cue.startFrame + 1, from + speechFrames);
        const cps = cue.chunk.length / ((endFrame - cue.startFrame) / fps);
        if (cps > limits.captions.maxCharsPerSecond) {
          errors.push(`${scene.id} caption ${ci + 1} terlalu cepat: ${cps.toFixed(1)} chars/s > ${limits.captions.maxCharsPerSecond}`);
        }
        let wPrev = cue.startFrame;
        const words = cue.cw.map((w) => {
          const ws = Math.min(Math.max(wPrev, from + Math.round(w.startSec * fps)), endFrame - 1);
          const we = Math.min(Math.max(ws + 1, from + Math.round(w.endSec * fps)), endFrame);
          wPrev = ws;
          return {text: w.text, startFrame: ws, endFrame: we};
        });
        captions.push({startFrame: cue.startFrame, endFrame, text: cue.chunk, words});
      });
    } else {
      // MODE ESTIMASI (legacy) - identik dengan perilaku lama.
      const totalChars = chunks.reduce((a, c) => a + c.length, 0) || 1;
      let cueStart = from;
      chunks.forEach((chunk, ci) => {
        let cueFrames = Math.max(
          Math.round(limits.captions.minDurationSec * fps),
          Math.round((chunk.length / totalChars) * speechFrames));
        if (ci === chunks.length - 1) cueFrames = Math.max(1, from + speechFrames - cueStart);
        const cps = chunk.length / (cueFrames / fps);
        if (cps > limits.captions.maxCharsPerSecond) {
          errors.push(`${scene.id} caption ${ci + 1} terlalu cepat: ${cps.toFixed(1)} chars/s > ${limits.captions.maxCharsPerSecond}`);
        }
        captions.push({startFrame: cueStart, endFrame: cueStart + cueFrames, text: chunk});
        cueStart += cueFrames;
      });
    }
    from += durationInFrames;
  }
  if (errors.length) throw new Error(`Compile gagal:\n- ${errors.join("\n- ")}`);

  return {
    renderProps: {
      schemaVersion: "1.1",
      accountPhase: locked.accountPhase, contentOrigin: locked.contentOrigin,
      episodeId: locked.episodeId, title: locked.title, pillar: locked.pillar,
      formatFamily: locked.formatFamily, voice: locked.voice, musicLane: locked.musicLane,
      campaign: locked.campaign, scenes, captions,
    },
    lockedSha, totalFrames: from, fps,
    captionTiming: {alignedScenes: alignedSceneTotal, totalScenes: locked.scenes.length},
  };
}

export function compileEpisode(id, ttsManifest, alignManifest = null) {
  const locked = readJson(P.lockedJson(id));
  const {renderProps, lockedSha, totalFrames, fps, captionTiming} = deriveRenderProps(locked, ttsManifest, alignManifest);

  const visualTexts = [];
  for (const s of renderProps.scenes) {
    for (const [k, v] of Object.entries(s.visual)) {
      if (typeof v === "string" && v.trim()) visualTexts.push({scene: s.id, field: k, text: v});
      if (Array.isArray(v)) v.forEach((item, i2) => {
        if (item && typeof item.label === "string") visualTexts.push({scene: s.id, field: `${k}[${i2}].label`, text: item.label});
      });
    }
  }
  const contentManifest = {
    episodeId: locked.episodeId, lockedSha256: lockedSha,
    renderPropsSha256: sha256Text(canonicalJson(renderProps)),
    totalFrames, fps,
    scenes: renderProps.scenes.map((s) => ({id: s.id, type: s.type, from: s.timing.from, durationInFrames: s.timing.durationInFrames})),
    visualTexts, captions: renderProps.captions,
  };
  const compileManifest = {
    episodeId: locked.episodeId, lockedSha256: lockedSha, fps, totalFrames,
    durationSec: Math.round((totalFrames / fps) * 100) / 100,
    compiledAt: new Date().toISOString(),
    captionTiming,
    sceneTimings: contentManifest.scenes, captionCount: renderProps.captions.length,
  };

  const workDir = P.work(id);
  writeJson(path.join(workDir, "render-props.json"), renderProps);
  writeJson(path.join(workDir, "render-content-manifest.json"), contentManifest);
  writeJson(path.join(workDir, "compile-manifest.json"), compileManifest);
  return {renderProps, contentManifest, compileManifest};
}
