import fs from "node:fs";
import path from "node:path";
import {P, SYSTEM_DIR, loadConfig, readJson, run, runOk, sha256Text, sha256File, ffprobeJson, writeJson, log} from "../cli/lib/util.mjs";
import {normalizeSpeechText} from "./speech-text.mjs";

function probeVoiceWav(wav, audioCfg) {
  const info = ffprobeJson(wav);
  const stream = info.streams.find((s) => s.codec_type === "audio");
  const duration = parseFloat(info.format.duration);
  const issues = [];
  if (!stream) issues.push("tidak ada audio stream");
  if (stream && parseInt(stream.sample_rate, 10) !== audioCfg.voice.expectedSampleRate) {
    issues.push(`sample rate ${stream.sample_rate} != ${audioCfg.voice.expectedSampleRate}`);
  }
  const stats = run("ffmpeg", ["-i", wav, "-af", "astats=metadata=1,silencedetect=n=-45dB:d=1.5", "-f", "null", "-"]).stderr;
  const peakMatch = stats.match(/Peak level dB:\s*(-?[\d.]+)/);
  const peakDb = peakMatch ? parseFloat(peakMatch[1]) : null;
  if (peakDb !== null && peakDb > audioCfg.voice.clippingPeakDbfs) issues.push(`voice hampir/clipping: peak ${peakDb} dBFS`);
  const silences = [...stats.matchAll(/silence_start: ([\d.]+)/g)].map((m) => parseFloat(m[1]));
  return {duration, sampleRate: stream ? parseInt(stream.sample_rate, 10) : null, peakDb, longSilences: silences, issues};
}

export function runTts(id) {
  const locked = readJson(P.lockedJson(id));
  const voices = loadConfig("voices");
  const audioCfg = loadConfig("audio");
  const cacheDir = P.ttsCache();
  const outDir = path.join(P.work(id), "audio");
  fs.mkdirSync(cacheDir, {recursive: true});
  fs.mkdirSync(outDir, {recursive: true});

  const entries = [];
  for (const scene of locked.scenes) {
    const spoken = normalizeSpeechText(scene.narration);
    if (spoken.changes.length) log(`tts: ${scene.id} narasi dinormalisasi ke spoken form (${spoken.changes.length} perubahan) utk prosodi natural`);
    const key = sha256Text([spoken.text, locked.voice, voices.engine, voices.modelVersion, String(voices.speed)].join("|"));
    const cached = path.join(cacheDir, `${key}.wav`);
    let generated = false;
    if (!fs.existsSync(cached)) {
      log(`tts: generate ${id}/${scene.id} (voice=${locked.voice})`);
      const script = path.join(SYSTEM_DIR, "scripts", "kokoro_tts.py");
      const venv = voices.pythonEnv.replace("~", process.env.HOME || "~");
      const r = run("bash", ["-lc",
        `source ${venv}/bin/activate && python ${JSON.stringify(script)} --text ${JSON.stringify(spoken.text)} --voice ${JSON.stringify(locked.voice)} --speed ${voices.speed} --out ${JSON.stringify(cached)}`]);
      if (r.status !== 0 || !fs.existsSync(cached)) {
        throw new Error(`TTS gagal untuk ${scene.id}. Build DIHENTIKAN (tidak boleh ada paket final palsu).\n${(r.stderr || r.stdout || "").slice(-2000)}`);
      }
      generated = true;
    } else {
      log(`tts: cache hit ${id}/${scene.id}`);
    }
    const probe = probeVoiceWav(cached, audioCfg);
    if (probe.issues.length) {
      throw new Error(`TTS ${scene.id} tidak lolos pemeriksaan: ${probe.issues.join("; ")}`);
    }
    const dest = path.join(outDir, `${scene.id}.wav`);
    fs.copyFileSync(cached, dest);
    entries.push({
      sceneId: scene.id, cacheKey: key, generated,
      narrationSha256: sha256Text(scene.narration),
      spokenText: spoken.text,
      wav: dest, wavSha256: sha256File(dest),
      durationSec: probe.duration, sampleRate: probe.sampleRate, peakDb: probe.peakDb,
    });
  }
  const manifest = {
    episodeId: id, voice: locked.voice, engine: voices.engine, modelVersion: voices.modelVersion,
    speed: voices.speed, generatedAt: new Date().toISOString(), scenes: entries,
  };
  writeJson(path.join(P.work(id), "tts-manifest.json"), manifest);
  return manifest;
}
