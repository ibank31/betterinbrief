import fs from "node:fs";
import path from "node:path";
import {P, canonicalJson, readJson, sha256File, sha256Text} from "../cli/lib/util.mjs";
import {deriveRenderProps} from "../pipeline/compile.mjs";
import {lockedCoreSha} from "../pipeline/lock.mjs";

const check = (list, id, ok, detail, level = "error") =>
  list.push({id, status: ok ? "pass" : (level === "warning" ? "warn" : "fail"), detail});

function diffPaths(a, b, prefix = "", out = []) {
  if (canonicalJson(a) === canonicalJson(b)) return out;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) { out.push(`${prefix}: panjang ${a.length} vs ${b.length}`); return out; }
    a.forEach((v, i) => diffPaths(v, b[i], `${prefix}[${i}]`, out));
    return out;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      diffPaths(a[k], b[k], prefix ? `${prefix}.${k}` : k, out);
    }
    return out;
  }
  out.push(`${prefix}: locked=${JSON.stringify(a)} vs render=${JSON.stringify(b)}`);
  return out;
}

/**
 * Gerbang anti-mismatch "JOB LOSS vs REPLACEMENT":
 * 1. Turunkan ulang render props dari episode.locked.json + tts-manifest (deterministik).
 * 2. Bandingkan canonical JSON dengan render-props.json yang tersimpan.
 * 3. Pastikan sha256 file props SAAT RENDER (render-manifest) == sha256 file props sekarang.
 * Jika ada satu teks pun berbeda, build GAGAL.
 */
export function qcContent(id) {
  const workDir = P.work(id);
  const checks = [];
  const locked = readJson(P.lockedJson(id));
  const lockedSha = lockedCoreSha(locked);
  check(checks, "content.lockedHash", locked.locked && locked.locked.sha256 === lockedSha,
    `hash tersimpan ${locked.locked ? locked.locked.sha256.slice(0, 12) : "-"} vs dihitung ${lockedSha.slice(0, 12)} - locked JSON tidak boleh diedit manual`);

  const propsPath = path.join(workDir, "render-props.json");
  const storedProps = readJson(propsPath);
  const tts = readJson(path.join(workDir, "tts-manifest.json"));
  const {renderProps: expected} = deriveRenderProps(locked, tts);
  const diffs = diffPaths(expected, storedProps);
  check(checks, "content.semanticConsistency", diffs.length === 0,
    diffs.length ? `RENDER INPUT BERBEDA DARI LOCKED JSON:\n  ${diffs.slice(0, 12).join("\n  ")}` : "render-props identik dengan derivasi ulang dari episode.locked.json");

  const renderManifest = readJson(path.join(workDir, "render-manifest.json"));
  const propsShaNow = sha256File(propsPath);
  check(checks, "content.renderInputHash", renderManifest.propsSha256 === propsShaNow,
    `props saat render ${renderManifest.propsSha256.slice(0, 12)} vs sekarang ${propsShaNow.slice(0, 12)}`);

  const content = readJson(path.join(workDir, "render-content-manifest.json"));
  check(checks, "content.contentManifestHash", content.lockedSha256 === lockedSha && content.renderPropsSha256 === sha256Text(canonicalJson(storedProps)),
    "render-content-manifest terikat ke locked & props yang sama");

  check(checks, "content.sceneCountOrder",
    storedProps.scenes.length === locked.scenes.length &&
    storedProps.scenes.every((s, i) => s.id === locked.scenes[i].id),
    `${storedProps.scenes.length} scene, urutan ${storedProps.scenes.map((s) => s.id).join(",")}`);

  // Semua teks visual yang dikirim ke render harus ada VERBATIM di locked JSON.
  const lockedTexts = new Set();
  for (const s of locked.scenes) {
    for (const v of Object.values(s.visual)) {
      if (typeof v === "string") lockedTexts.add(v);
      if (Array.isArray(v)) v.forEach((it) => { if (it && typeof it.label === "string") lockedTexts.add(it.label); });
    }
  }
  const stray = content.visualTexts.filter((t) => !lockedTexts.has(t.text));
  check(checks, "content.visualTextManifest", stray.length === 0,
    stray.length ? `Teks di render TIDAK ada di locked JSON: ${stray.slice(0, 5).map((s) => `${s.scene}.${s.field}="${s.text}"`).join("; ")}` : `${content.visualTexts.length} teks visual semuanya berasal dari locked JSON`);

  const narrations = new Set(locked.scenes.map((s) => s.narration));
  const badCaps = content.captions.filter((c) => ![...narrations].some((n) => n.includes(c.text)));
  check(checks, "content.captionsManifest", badCaps.length === 0,
    badCaps.length ? `Caption bukan potongan narasi locked: "${badCaps[0].text}"` : `${content.captions.length} caption cocok dengan narasi locked`);

  // sources / claims / rights / title / packaging
  check(checks, "content.sourcesPresent", locked.sources.length > 0, `${locked.sources.length} sources`);
  const evidenceDir = path.join(P.episodes(id), "sources");
  const evidenceFiles = fs.existsSync(evidenceDir) ? fs.readdirSync(evidenceDir).filter((f) => !f.startsWith(".")) : [];
  check(checks, "content.sourceEvidence", evidenceFiles.length > 0, evidenceFiles.length ? `${evidenceFiles.length} file bukti` : "folder sources kosong - simpan PDF/screenshot bukti", "warning");
  check(checks, "content.claimsVerified", locked.claims.every((c) => c.verified === true), "semua claims verified");
  check(checks, "content.rights", ["musicLicensed", "visualsOriginal", "narrationOriginal", "factsVerified"].every((k) => locked.rights[k] === true), JSON.stringify(locked.rights));
  check(checks, "content.titleConsistency", storedProps.title === locked.title, `"${storedProps.title}"`);
  check(checks, "content.packaging", Boolean(locked.packaging.youtubeTitle && locked.packaging.instagramCaption && locked.packaging.tiktokCaption), "publishing copy lengkap");
  return {checks};
}
