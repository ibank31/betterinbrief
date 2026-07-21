import fs from "node:fs";
import path from "node:path";
import {SYSTEM_DIR, loadConfig, readJson} from "../cli/lib/util.mjs";

const SCENE_VARIANTS = {
  hook: ["statistic", "contrarian", "question"],
  correction: ["equation", "strike_replace", "reframe"],
  data_proof: ["single_value", "proportion", "comparison", "timeline"],
  task_breakdown: ["cards", "stack", "flow"],
  comparison: ["split", "ladder", "timeline", "two_speed"],
  outcome: ["statement", "question", "framework", "reframe"],
  closing_brand: ["standard"],
};
const VISUAL_REQUIRED = {
  hook: ["eyebrow", "statistic", "statisticSuffix", "headline"],
  correction: ["eyebrow", "misconception", "correction"],
  data_proof: ["eyebrow", "value", "label", "source"],
  task_breakdown: ["eyebrow", "headline", "jobTitle", "tasks"],
  comparison: ["eyebrow", "leftLabel", "leftValue", "rightLabel", "rightValue", "verdict"],
  outcome: ["eyebrow", "setup", "outcome", "comparison", "question"],
  closing_brand: ["tagline"],
};

const VISUAL_LANES = [
  "editorial_collage", "evidence_desk", "diagram_world",
  "object_metaphor", "interface_reality", "cinematic_context",
  "data_theatre", "editorial_type",
];
const VISUAL_DENSITIES = ["quiet", "editorial", "dense"];
const VISUAL_MATERIALS = ["paper", "scan", "grid", "grain", "halftone"];

function checkEnum(errors, schema, obj, key, where) {
  const spec = schema.properties[key];
  if (spec && spec.enum && !spec.enum.includes(obj[key])) {
    errors.push(`${where}: nilai "${obj[key]}" untuk ${key} tidak dikenal. Pilihan: ${spec.enum.join(", ")}`);
  }
}

export function validateEpisode(episode) {
  const errors = [];
  const warnings = [];
  const schema = readJson(path.join(SYSTEM_DIR, "schemas", "episode.schema.json"));
  const limits = loadConfig("limits");
  const voices = loadConfig("voices");

  if (episode.schemaVersion !== "1.0") {
    errors.push(`schemaVersion "${episode.schemaVersion}" tidak didukung. Versi saat ini: 1.0 (lihat schemas/MIGRATIONS.md).`);
    return {errors, warnings};
  }
  for (const key of schema.required) {
    if (!(key in episode)) errors.push(`Field wajib hilang: ${key}`);
  }
  for (const key of Object.keys(episode)) {
    if (!(key in schema.properties)) errors.push(`Field tidak dikenal: ${key} (schema additionalProperties=false)`);
  }
  if (errors.length) return {errors, warnings};

  if (!/^[A-Za-z0-9_-]{3,40}$/.test(episode.episodeId)) errors.push("episodeId harus 3-40 karakter [A-Za-z0-9_-]");
  for (const k of ["status", "accountPhase", "contentOrigin", "pillar", "formatFamily", "musicLane"]) {
    checkEnum(errors, schema, episode, k, "episode");
  }
  if (episode.title.length > limits.text.titleMax) errors.push(`title melebihi ${limits.text.titleMax} karakter`);
  if (!voices.allowedVoices.includes(episode.voice)) {
    errors.push(`voice "${episode.voice}" tidak ada di config/voices.json (${voices.allowedVoices.join(", ")})`);
  }

  // rights
  const r = episode.rights || {};
  for (const k of ["musicLicensed", "visualsOriginal", "narrationOriginal", "factsVerified"]) {
    if (r[k] !== true) errors.push(`rights.${k} harus true sebelum lock`);
  }
  // campaign policy
  if (episode.contentOrigin === "original" && episode.campaign !== null) errors.push("contentOrigin original: campaign harus null");
  if (episode.contentOrigin === "campaign") {
    if (episode.accountPhase !== "mature") errors.push("Campaign hanya boleh pada accountPhase mature");
    if (episode.formatFamily !== "campaign_clip") errors.push("Campaign harus formatFamily campaign_clip");
    if (!episode.campaign) errors.push("campaign metadata wajib");
    else for (const k of ["briefVerified", "rightsVerified"]) if (episode.campaign[k] !== true) errors.push(`campaign.${k} harus true`);
  }

  // sources & claims
  const sourceIds = new Set();
  for (const s of episode.sources) {
    if (!/^SRC[0-9]{2,}$/.test(s.sourceId || "")) errors.push(`sourceId tidak valid: ${s.sourceId}`);
    if (sourceIds.has(s.sourceId)) errors.push(`sourceId duplikat: ${s.sourceId}`);
    sourceIds.add(s.sourceId);
    for (const k of ["url", "publisher", "title", "accessedDate"]) {
      if (!s[k] || !String(s[k]).trim()) errors.push(`Source ${s.sourceId}: ${k} kosong`);
    }
  }
  const claimIds = new Set();
  for (const c of episode.claims) {
    if (!/^C[0-9]{2,}$/.test(c.claimId || "")) errors.push(`claimId tidak valid: ${c.claimId}`);
    if (claimIds.has(c.claimId)) errors.push(`claimId duplikat: ${c.claimId}`);
    claimIds.add(c.claimId);
    if (!sourceIds.has(c.sourceId)) errors.push(`Claim ${c.claimId} menunjuk source tidak dikenal: ${c.sourceId}`);
    if (c.verified !== true) errors.push(`Claim ${c.claimId} belum verified - episode tidak boleh di-lock`);
  }

  // scenes
  const n = episode.scenes.length;
  if (n < limits.scenes.minPerEpisode || n > limits.scenes.maxPerEpisode) {
    errors.push(`Jumlah scene ${n} di luar batas ${limits.scenes.minPerEpisode}-${limits.scenes.maxPerEpisode}`);
  }
  const roles = new Set(episode.scenes.map((s) => s.role));
  if (!roles.has("evidence")) errors.push("Episode wajib punya scene role evidence");
  if (!roles.has("outcome")) errors.push("Episode wajib punya scene role outcome");
  episode.scenes.forEach((s, i) => {
    const expected = `S${String(i + 1).padStart(2, "0")}`;
    const where = `scene ${s.id || i + 1}`;
    if (s.id !== expected) errors.push(`${where}: id harus ${expected} (berurutan)`);
    if (!(s.type in SCENE_VARIANTS)) { errors.push(`${where}: type "${s.type}" tidak dikenal`); return; }
    if (!SCENE_VARIANTS[s.type].includes(s.variant)) {
      errors.push(`${where}: variant "${s.variant}" tidak valid untuk ${s.type} (${SCENE_VARIANTS[s.type].join(", ")})`);
    }
    if (i === 0 && (s.role !== "hook" || s.type !== "hook")) errors.push("Scene pertama harus hook");
    if (i === n - 1 && (s.role !== "closing" || s.type !== "closing_brand")) errors.push("Scene terakhir harus closing_brand");
    if (!s.narration || !s.narration.trim()) errors.push(`${where}: narration kosong`);
    else if (s.narration.length > limits.text.narrationMaxPerScene) errors.push(`${where}: narration melebihi ${limits.text.narrationMaxPerScene} karakter`);
    const req = VISUAL_REQUIRED[s.type] || [];
    for (const k of req) {
      if (s.visual == null || s.visual[k] == null || (typeof s.visual[k] === "string" && !s.visual[k].trim() && k !== "suffix")) {
        errors.push(`${where}: visual.${k} wajib untuk type ${s.type}`);
      }
    }
    // text length limits (anti-overflow)
    const v = s.visual || {};
    const checkLen = (field, max) => {
      if (typeof v[field] === "string" && v[field].length > max) {
        errors.push(`${where}: visual.${field} (${v[field].length}) melebihi batas ${max} karakter - berisiko overflow`);
      }
    };
    checkLen("eyebrow", limits.text.eyebrowMax);
    checkLen("headline", limits.text.headlineMax);
    checkLen("subtitle", limits.text.subtitleMax);
    checkLen("label", limits.text.labelMax);
    checkLen("statistic", limits.text.statisticMax);
    // Visual Operating System v2. This is optional for legacy episodes: the
    // renderer resolves a scene-type default. When authors opt in, validate
    // the instruction early so every future render is deterministic.
    if (s.visualSystem !== undefined) {
      if (!s.visualSystem || typeof s.visualSystem !== "object" || Array.isArray(s.visualSystem)) {
        errors.push(`${where}: visualSystem harus object`);
      } else {
        const vs = s.visualSystem;
        if (vs.lane !== undefined && !VISUAL_LANES.includes(vs.lane)) {
          errors.push(`${where}: visualSystem.lane tidak dikenal`);
        }
        if (vs.density !== undefined && !VISUAL_DENSITIES.includes(vs.density)) {
          errors.push(`${where}: visualSystem.density tidak dikenal`);
        }
        if (vs.material !== undefined && !VISUAL_MATERIALS.includes(vs.material)) {
          errors.push(`${where}: visualSystem.material tidak dikenal`);
        }
        if (vs.seed !== undefined && (typeof vs.seed !== "string" || !vs.seed.trim())) {
          errors.push(`${where}: visualSystem.seed harus string tidak kosong`);
        }
      }
    }
    // fact-bearing scenes must reference verified claims
    if ((s.type === "data_proof" || s.role === "evidence")) {
      if (!Array.isArray(s.claims) || s.claims.length === 0) {
        errors.push(`${where}: scene evidence/data_proof wajib menunjuk claims[]`);
      } else for (const cid of s.claims) {
        if (!claimIds.has(cid)) errors.push(`${where}: claim ${cid} tidak ditemukan`);
      }
    }
  });

  // packaging
  const p = episode.packaging || {};
  if (!p.youtubeTitle || !p.youtubeTitle.trim()) errors.push("packaging.youtubeTitle kosong");
  if (p.youtubeTitle && p.youtubeTitle.length > limits.text.youtubeTitleMax) errors.push(`packaging.youtubeTitle melebihi ${limits.text.youtubeTitleMax}`);
  if (!p.instagramCaption || !p.instagramCaption.trim()) errors.push("packaging.instagramCaption kosong");
  if (!p.tiktokCaption || !p.tiktokCaption.trim()) errors.push("packaging.tiktokCaption kosong");

  return {errors, warnings};
}
