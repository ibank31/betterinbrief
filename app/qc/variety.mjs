import path from "node:path";
import {P, loadConfig, readJson, writeJson} from "../cli/lib/util.mjs";

const check = (list, id, ok, detail, level = "error") =>
  list.push({id, status: ok ? "pass" : (level === "warning" ? "warn" : "fail"), detail});

// ============================================================================
// REPLIKA LOGIKA RENDERER - WAJIB SINKRON DENGAN:
//   app/remotion/src/visual/VisualWorld.tsx
//     (hashKey, laneDefaults, laneOptionsByType, deviceOptionsByType,
//      defaultVisualWorld)
//   app/remotion/src/compositions/GenericEpisode.tsx
//     (merge {...default, ...scene.visualSystem}, seed episodeId-sceneId)
// Renderer berjalan sebagai bundle TS di Chromium dan tidak bisa diimpor dari
// Node. Jika tabel/algoritma di sana berubah, SALIN perubahan ke sini - kalau
// tidak, sidik jari ledger diam-diam bohong.
// ============================================================================
const laneDefaults = {
  editorial_collage: {density: "editorial", material: "paper"},
  evidence_desk: {density: "editorial", material: "scan"},
  diagram_world: {density: "editorial", material: "grid"},
  object_metaphor: {density: "quiet", material: "grain"},
  interface_reality: {density: "editorial", material: "grid"},
  cinematic_context: {density: "quiet", material: "grain"},
  data_theatre: {density: "dense", material: "halftone"},
  editorial_type: {density: "quiet", material: "paper"},
};

const laneOptionsByType = {
  hook: ["object_metaphor", "editorial_collage", "interface_reality"],
  correction: ["editorial_collage", "diagram_world", "editorial_type"],
  data_proof: ["evidence_desk", "data_theatre", "diagram_world"],
  task_breakdown: ["diagram_world", "interface_reality"],
  comparison: ["diagram_world", "data_theatre", "evidence_desk"],
  outcome: ["editorial_type", "object_metaphor", "cinematic_context"],
  closing_brand: ["editorial_type"],
  timeline: ["diagram_world", "evidence_desk", "data_theatre"],
  ranking: ["data_theatre", "diagram_world", "evidence_desk"],
  before_after: ["editorial_collage", "editorial_type", "diagram_world"],
  process: ["diagram_world", "interface_reality"],
  quote: ["evidence_desk", "editorial_type", "cinematic_context"],
};

const deviceOptionsByType = {
  hook: ["two_tracks", "priority_signal", "evidence_scan"],
  correction: ["decision_graph", "evidence_scan", "two_tracks"],
  data_proof: ["evidence_scan", "priority_signal", "decision_graph"],
  task_breakdown: ["task_system", "decision_graph"],
  comparison: ["two_tracks", "decision_graph", "priority_signal"],
  outcome: ["priority_signal", "decision_graph", "evidence_scan"],
  closing_brand: [],
  timeline: ["decision_graph", "evidence_scan"],
  ranking: ["priority_signal", "decision_graph"],
  before_after: ["two_tracks", "evidence_scan"],
  process: ["task_system", "decision_graph"],
  quote: ["evidence_scan"],
};

const hashKey = (value) => {
  let h = 5381;
  for (let i = 0; i < value.length; i += 1) h = ((h * 33) ^ value.charCodeAt(i)) >>> 0;
  return h;
};

// Dunia visual efektif sebuah scene, identik dengan hasil renderer.
export function sceneWorld(episodeId, scene) {
  const lanes = laneOptionsByType[scene.type] ?? ["editorial_collage"];
  const devices = deviceOptionsByType[scene.type] ?? [];
  const key = `${episodeId}:${scene.id}`;
  const lane = lanes[hashKey(`${key}:lane:${scene.type}`) % lanes.length] ?? "editorial_collage";
  const world = {
    lane,
    density: laneDefaults[lane].density,
    material: laneDefaults[lane].material,
    seed: `${episodeId}-${scene.id}`,
  };
  if (devices.length > 0) world.device = devices[hashKey(`${key}:device:${scene.type}`) % devices.length];
  const merged = {...world, ...(scene.visualSystem ?? {})};
  if (!merged.seed) merged.seed = `${episodeId}-${scene.id}`;
  return merged;
}

function footageSubjects(scene) {
  return (scene.visualAssets ?? [])
    .map((a) => {
      if (a && a.fetch && typeof a.fetch.query === "string" && a.fetch.query.trim() !== "") return a.fetch.query.trim();
      if (a && typeof a.file === "string" && a.file !== "") return path.basename(a.file);
      return "";
    })
    .filter((s) => s !== "");
}

function salientTokens(text, stopwords) {
  return [...new Set(text.toLowerCase().split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !stopwords.includes(t)))];
}

// Sidik jari visual per scene: apa yang membuat episode ini terlihat seperti
// dirinya (tipe, variant, surface, lane, device, material, subjek footage).
export function buildFingerprint(locked) {
  return locked.scenes.map((scene) => {
    const world = sceneWorld(locked.episodeId, scene);
    const subjects = footageSubjects(scene);
    return {
      sceneId: scene.id,
      type: scene.type,
      variant: scene.variant ?? null,
      surface: scene.surface ?? null,
      lane: world.lane ?? null,
      device: world.device ?? null,
      material: world.material ?? null,
      footageSubject: subjects.length > 0 ? subjects.join(" | ") : null,
    };
  });
}

// Klien D1 REST minimal. SELALU non-fatal: build tidak boleh gagal karena
// layanan eksternal - kegagalan dilaporkan sebagai warning QC.
async function d1Query(ledgerCfg, sql, params) {
  const token = process.env[ledgerCfg.apiTokenEnv];
  if (!token) return {skipped: true, reason: `env ${ledgerCfg.apiTokenEnv} tidak diisi (repo secret belum ada)`};
  const url = "https://api.cloudflare.com/client/v4/accounts/" + ledgerCfg.accountId + "/d1/database/" + ledgerCfg.databaseId + "/query";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ledgerCfg.timeoutMs ?? 15000);
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {authorization: `Bearer ${token}`, "content-type": "application/json"},
      body: JSON.stringify({sql, params}),
    });
    const body = await res.json();
    if (!res.ok || body.success !== true) {
      return {skipped: true, reason: `HTTP ${res.status}: ${JSON.stringify(body.errors ?? []).slice(0, 200)}`};
    }
    return {skipped: false, results: (body.result && body.result[0] && body.result[0].results) || []};
  } catch (e) {
    return {skipped: true, reason: e.message};
  } finally {
    clearTimeout(timer);
  }
}

export async function qcVariety(id) {
  const cfg = loadConfig("variety");
  const checks = [];
  const locked = readJson(P.lockedJson(id));
  const fingerprint = buildFingerprint(locked);
  const builtAt = new Date().toISOString();

  // 1. GERBANG intra-episode: subjek footage tidak boleh kembar dalam satu
  //    episode (kasus dua backdrop laptop Seed_004). Kata bermakna yang sama
  //    pada dua query = subjek kembar -> FAIL, ganti query lalu fetch ulang.
  const stopwords = cfg.footage.stopwords;
  const withFootage = [];
  for (const scene of locked.scenes) {
    for (const subject of footageSubjects(scene)) {
      withFootage.push({sceneId: scene.id, subject, tokens: salientTokens(subject, stopwords)});
    }
  }
  const dupPairs = [];
  for (let i = 0; i < withFootage.length; i += 1) {
    for (let j = i + 1; j < withFootage.length; j += 1) {
      const shared = withFootage[i].tokens.filter((t) => withFootage[j].tokens.includes(t));
      if (shared.length > 0) dupPairs.push(`${withFootage[i].sceneId}+${withFootage[j].sceneId} (kata sama: ${shared.join(", ")})`);
    }
  }
  check(checks, "variety.footageSubjects", dupPairs.length === 0,
    dupPairs.length
      ? `Subjek footage kembar dalam satu episode - ganti query aset: ${dupPairs.join("; ")}`
      : `${withFootage.length} aset footage, semua subjek berbeda`);

  // 2. Tulis sidik jari ke ledger D1 (memori antar-episode; non-fatal).
  const runNumber = process.env.GITHUB_RUN_NUMBER ? Number(process.env.GITHUB_RUN_NUMBER) : null;
  const commitSha = process.env.GITHUB_SHA ?? null;
  const values = fingerprint.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
  const insertSql = `INSERT INTO scene_fingerprints (episode_id, built_at, run_number, commit_sha, scene_id, scene_type, variant, surface, lane, device, material, footage_subject) VALUES ${values}`;
  const insertParams = fingerprint.flatMap((f) => [
    locked.episodeId, builtAt, runNumber, commitSha,
    f.sceneId, f.type, f.variant, f.surface, f.lane, f.device, f.material, f.footageSubject,
  ]);
  const wrote = await d1Query(cfg.ledger, insertSql, insertParams);
  check(checks, "variety.ledgerWrite", !wrote.skipped,
    wrote.skipped
      ? `ledger dilewati (build tetap jalan): ${wrote.reason}`
      : `${fingerprint.length} baris sidik jari tercatat di D1`,
    "warning");

  // 3. Peringatan dini anti-template: bandingkan kombinasi type:lane:device
  //    dengan build terakhir tiap episode lain di ledger (non-fatal).
  if (wrote.skipped) {
    check(checks, "variety.crossEpisode", false, "perbandingan dilewati: ledger tidak terjangkau", "warning");
  } else {
    const prefixes = cfg.compare.excludeEpisodePrefixes ?? [];
    const notLike = prefixes.map(() => "episode_id NOT LIKE ?").join(" AND ");
    const readSql = `SELECT episode_id, built_at, scene_type, lane, device FROM scene_fingerprints WHERE episode_id <> ?${notLike ? ` AND ${notLike}` : ""} ORDER BY built_at DESC LIMIT 500`;
    const read = await d1Query(cfg.ledger, readSql, [locked.episodeId, ...prefixes.map((p) => `${p}%`)]);
    if (read.skipped) {
      check(checks, "variety.crossEpisode", false, `perbandingan dilewati: ${read.reason}`, "warning");
    } else {
      const byEpisode = new Map();
      for (const row of read.results) {
        const cur = byEpisode.get(row.episode_id);
        if (!cur || row.built_at > cur.builtAt) byEpisode.set(row.episode_id, {builtAt: row.built_at, rows: []});
      }
      for (const row of read.results) {
        const cur = byEpisode.get(row.episode_id);
        if (cur && row.built_at === cur.builtAt) cur.rows.push(row);
      }
      const recent = [...byEpisode.entries()]
        .sort((a, b) => (a[1].builtAt < b[1].builtAt ? 1 : -1))
        .slice(0, cfg.compare.lastEpisodes);
      const mine = fingerprint.map((f) => `${f.type}:${f.lane}:${f.device ?? "-"}`);
      const tooSimilar = [];
      for (const [epId, data] of recent) {
        const pool = data.rows.map((r) => `${r.scene_type}:${r.lane}:${r.device ?? "-"}`);
        let match = 0;
        for (const sig of mine) {
          const at = pool.indexOf(sig);
          if (at >= 0) { match += 1; pool.splice(at, 1); }
        }
        const ratio = mine.length > 0 ? match / mine.length : 0;
        if (ratio >= cfg.compare.warnOverlapRatio) tooSimilar.push(`${epId} (${Math.round(ratio * 100)}% kombinasi scene/lane/device sama)`);
      }
      check(checks, "variety.crossEpisode", tooSimilar.length === 0,
        tooSimilar.length
          ? `Episode terlalu mirip dengan: ${tooSimilar.join("; ")} - variasikan visualSystem atau susunan tipe scene`
          : (recent.length === 0 ? "ledger belum berisi episode pembanding" : `cukup berbeda dari ${recent.length} episode terakhir`),
        "warning");
    }
  }

  const fingerprintPath = path.join(P.work(id), "variety-fingerprint.json");
  writeJson(fingerprintPath, {episodeId: locked.episodeId, builtAt, runNumber, commitSha, scenes: fingerprint});
  return {checks, fingerprint, fingerprintPath};
}
