import fs from "node:fs";
import path from "node:path";
import {P, SYSTEM_DIR, loadConfig, readJson, run, runOk, sha256File, writeJson, log} from "../cli/lib/util.mjs";
import {renderSfxTrack} from "./sfx.mjs";

function pickMusic(musicLane) {
  const laneDir = path.join(SYSTEM_DIR, "assets", "music", musicLane);
  if (fs.existsSync(laneDir)) {
    const files = fs.readdirSync(laneDir).filter((f) => /\.(wav|mp3|flac)$/i.test(f)).sort();
    if (files.length) return {file: path.join(laneDir, files[0]), fixture: false};
  }
  const fixture = path.join(SYSTEM_DIR, "assets", "music", "_fixture-silence-5s.wav");
  if (!fs.existsSync(fixture)) throw new Error("Tidak ada musik untuk lane dan fixture tidak ditemukan");
  return {file: fixture, fixture: true};
}

function parseLoudnorm(stderr) {
  // FFmpeg >= 7.1 menambahkan baris ringkasan SETELAH blok JSON loudnorm,
  // jadi ambil blok JSON loudnorm terakhir di mana pun posisinya.
  const blocks = stderr.match(/\{[^{}]*?"input_i"[\s\S]*?\}/g);
  if (!blocks || blocks.length === 0) {
    throw new Error(`Tidak bisa membaca hasil loudnorm:\n${stderr.slice(-1500)}`);
  }
  return JSON.parse(blocks[blocks.length - 1]);
}

export function mixEpisode(id) {
  const audioCfg = loadConfig("audio");
  const workDir = P.work(id);
  const render = readJson(path.join(workDir, "render-manifest.json"));
  const music = pickMusic(readJson(path.join(workDir, "render-props.json")).musicLane);
  // v1.6a: track SFX sintetis (whoosh/tick/impact) — null bila mati/tanpa event.
  const sfx = renderSfxTrack(id);
  const mixDir = path.join(workDir, "mix");
  fs.mkdirSync(mixDir, {recursive: true});

  const draft = path.join(mixDir, "mix-draft.wav");
  const final = path.join(mixDir, "mixed-audio.wav");
  const duck = audioCfg.music.duck;
  // Voice (dari mezzanine) + musik yang di-duck via sidechain + bus SFX yang
  // juga di-duck oleh voice (ratio lebih lembut agar tick tetap terdengar).
  const inputs = ["-i", render.mezzanine, "-stream_loop", "-1", "-i", music.file];
  let graph =
    `[1:a]aloop=loop=-1:size=2e+09,volume=${audioCfg.music.baseGainDb}dB[m];` +
    `[m][0:a]sidechaincompress=threshold=${duck.threshold}:ratio=${duck.ratio}:attack=${duck.attackMs}:release=${duck.releaseMs}[md];`;
  if (sfx) {
    const sduck = audioCfg.sfx.duck;
    inputs.push("-i", sfx.track);
    graph +=
      `[2:a]volume=${audioCfg.sfx.busGainDb}dB[s];` +
      `[s][0:a]sidechaincompress=threshold=${sduck.threshold}:ratio=${sduck.ratio}:attack=${sduck.attackMs}:release=${sduck.releaseMs}[sd];` +
      `[0:a][md][sd]amix=inputs=3:duration=first:normalize=0[out]`;
  } else {
    graph += `[0:a][md]amix=inputs=2:duration=first:normalize=0[out]`;
  }
  runOk("ffmpeg", ["-y", "-v", "error", ...inputs,
    "-filter_complex", graph, "-map", "[out]",
    "-ar", String(audioCfg.sampleRate), "-ac", String(audioCfg.channels), "-c:a", "pcm_s24le", draft]);

  // Loudness normalization 2-pass ke target canonical config/audio.json.
  const target = `I=${audioCfg.integratedLoudnessTargetLufs}:TP=${audioCfg.truePeakMaxDbtp - 0.5}:LRA=${audioCfg.lraMaxLu}`;
  const p1 = run("ffmpeg", ["-i", draft, "-af", `loudnorm=${target}:print_format=json`, "-f", "null", "-"]);
  const measured = parseLoudnorm(p1.stderr);
  const linear = `loudnorm=${target}:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true:print_format=json`;
  const p2 = run("ffmpeg", ["-y", "-v", "info", "-i", draft, "-af", linear,
    "-ar", String(audioCfg.sampleRate), "-ac", String(audioCfg.channels), "-c:a", "pcm_s24le", final]);
  if (p2.status !== 0) throw new Error(`Loudnorm pass 2 gagal:\n${p2.stderr.slice(-1500)}`);
  const out = parseLoudnorm(p2.stderr);

  let outI = parseFloat(out.output_i);
  let outTp = parseFloat(out.output_tp);
  let outLra = out.output_lra;
  const targetI = audioCfg.integratedLoudnessTargetLufs;
  const tol = audioCfg.loudnessToleranceLu;

  // Pass 3 (koreksi): loudnorm linear bisa berhenti di bawah target saat gain
  // dibatasi true peak ceiling. Materi dengan crest factor tinggi (VO jarang,
  // puncak konsonan tajam — kasus SmokeTest) tidak bisa dinaikkan sekali gain
  // besar: limiter harus memotong terlalu dalam dan TP guard menolak.
  // Kompresor 4:1 pre-limiter (v3) terbukti GAGAL di run #10: attack 4 ms
  // meloloskan puncak transien tetapi meremuk badan sinyal ~3.6 LU tanpa
  // makeup — tiap pass justru LEBIH PELAN dari input dan crest factor malah
  // naik. Solusi v4: gain BERTAHAP maksimum 2.5 dB per pass; limiter (margin
  // 0.7 dB di bawah ceiling TP untuk overshoot inter-sample) hanya mencukur
  // transien tipis di tiap tahap sehingga badan sinyal menerima gain penuh.
  // Pass yang diterima menjadi basis pass berikutnya. Jika sebuah pass
  // ditolak, ulangi dengan gain setengahnya (backoff). Episode penuh dengan
  // narasi rapat biasanya lolos dari pass linear dan tidak menyentuh pass ini.
  let backoff = 1;
  const maxStepDb = 2.5;
  for (let i = 0; i < 8 && Math.abs(outI - targetI) > tol * 0.75; i++) {
    const rawGainDb = (targetI - outI) * backoff;
    const gainDb = +(Math.sign(rawGainDb) * Math.min(Math.abs(rawGainDb), maxStepDb)).toFixed(2);
    if (Math.abs(gainDb) < 0.2) break;
    const limit = Math.pow(10, (audioCfg.truePeakMaxDbtp - 0.7) / 20);
    const corrected = path.join(mixDir, "mixed-audio.corrected.wav");
    runOk("ffmpeg", ["-y", "-v", "error", "-i", final,
      "-af", `volume=${gainDb}dB,alimiter=limit=${limit.toFixed(4)}:attack=5:release=100:level=false`,
      "-ar", String(audioCfg.sampleRate), "-ac", String(audioCfg.channels), "-c:a", "pcm_s24le", corrected]);
    const pm = run("ffmpeg", ["-i", corrected, "-af", `loudnorm=${target}:print_format=json`, "-f", "null", "-"]);
    const meas2 = parseLoudnorm(pm.stderr);
    const newI = parseFloat(meas2.input_i);
    const newTp = parseFloat(meas2.input_tp);
    const improved = Math.abs(newI - targetI) < Math.abs(outI - targetI);
    const tpOk = newTp <= audioCfg.truePeakMaxDbtp + 0.1;
    if (!improved || !tpOk) {
      fs.rmSync(corrected);
      backoff *= 0.5;
      log(`mix: pass koreksi ditolak (I=${newI}, TP=${newTp}); ulangi dengan gain ${Math.round(backoff * 100)}%`);
      continue;
    }
    fs.renameSync(corrected, final);
    outI = newI;
    outTp = newTp;
    outLra = meas2.input_lra;
    backoff = 1;
    log(`mix: pass koreksi ${gainDb > 0 ? "+" : ""}${gainDb} dB -> I=${outI} LUFS, TP=${outTp} dBTP`);
  }

  const issues = [];
  if (Math.abs(outI - targetI) > tol) {
    issues.push(`Integrated ${outI} LUFS meleset > ${tol} LU dari target ${targetI}`);
  }
  if (outTp > audioCfg.truePeakMaxDbtp + 0.1) issues.push(`True peak ${outTp} dBTP melewati ${audioCfg.truePeakMaxDbtp}`);
  if (issues.length) throw new Error(`Audio mix di luar threshold:\n- ${issues.join("\n- ")}`);

  const manifest = {
    episodeId: id, mixedAt: new Date().toISOString(),
    music: {file: music.file, fixture: music.fixture, sha256: sha256File(music.file), baseGainDb: audioCfg.music.baseGainDb, duck},
    sfx: sfx ? {track: sfx.track, eventCount: sfx.manifest.eventCount, busGainDb: audioCfg.sfx.busGainDb, duck: audioCfg.sfx.duck, sha256: sfx.manifest.trackSha256} : null,
    loudness: {
      config: "config/audio.json",
      targetIntegratedLufs: audioCfg.integratedLoudnessTargetLufs,
      truePeakMaxDbtp: audioCfg.truePeakMaxDbtp,
      measuredInput: {i: measured.input_i, tp: measured.input_tp, lra: measured.input_lra},
      measuredOutput: {i: String(outI), tp: String(outTp), lra: String(outLra)},
    },
    mixedAudio: final, mixedAudioSha256: sha256File(final),
  };
  writeJson(path.join(workDir, "mix-manifest.json"), manifest);
  log(`mix: ${id} selesai (I=${outI} LUFS, TP=${outTp} dBTP${sfx ? `, SFX=${sfx.manifest.eventCount} event` : ""}${music.fixture ? ", MUSIC=FIXTURE-SILENT" : ""})`);
  return manifest;
}
