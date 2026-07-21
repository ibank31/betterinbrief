import fs from "node:fs";
import path from "node:path";
import {SYSTEM_DIR, homeDir, readJson, sha256File, writeJson, log} from "../cli/lib/util.mjs";

function globToRegex(glob) {
  return new RegExp(`^${glob.replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*\//g, "(?:.*/)?").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*")}$`, "i");
}
function walk(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, base, out);
    else out.push(path.relative(base, full));
  }
  return out;
}

export function migrateOld(oldDir, {apply = false} = {}) {
  if (!fs.existsSync(oldDir)) throw new Error(`Folder lama tidak ditemukan: ${oldDir}`);
  const rules = readJson(path.join(SYSTEM_DIR, "..", "migration", "migration-rules.json"));
  const home = homeDir();
  const files = walk(oldDir);
  const seenHashes = new Map();
  const plan = [];

  for (const rel of files) {
    const abs = path.join(oldDir, rel);
    let action = {file: rel, as: "unclassified", dest: "archive/unclassified", reason: "tidak cocok aturan manapun"};
    for (const rule of rules.classify) {
      if (rule.match.some((g) => globToRegex(g).test(rel))) {
        action = {file: rel, as: rule.as, dest: rule.dest, reason: `cocok pola ${rule.match.join("|")}`};
        break;
      }
    }
    if (action.dest === null || action.as.startsWith("skip")) {
      plan.push({...action, op: "skip"});
      continue;
    }
    const hash = sha256File(abs);
    if (seenHashes.has(hash)) {
      plan.push({...action, op: "skip-duplicate", duplicateOf: seenHashes.get(hash), sha256: hash});
      continue;
    }
    seenHashes.set(hash, rel);
    const destRel = path.join(action.dest.replace("{episode}", rel.split("/")[1] || "_unknown"), path.basename(rel));
    plan.push({...action, op: "copy", to: destRel, sha256: hash});
  }

  const planPath = path.join(home, "work", "migration-plan.json");
  writeJson(planPath, {
    mode: apply ? "apply" : "dry-run", from: oldDir, to: home,
    createdAt: new Date().toISOString(),
    counts: {copy: plan.filter((p) => p.op === "copy").length, skip: plan.filter((p) => p.op !== "copy").length},
    note: "Tidak ada file lama yang dihapus atau dipindah. Hanya COPY.",
    plan,
  });
  log(`migrate: rencana ditulis ke ${planPath} (${plan.filter((p) => p.op === "copy").length} copy, mode ${apply ? "APPLY" : "dry-run"})`);

  if (!apply) {
    console.log(`\nDRY-RUN selesai. Periksa ${planPath}, lalu jalankan:\n  binb migrate ${oldDir} --apply\n`);
    return {planPath, applied: false};
  }
  // backup config sebelum apply
  const backupDir = path.join(home, "archive", `pre-migration-backup-${Date.now()}`);
  fs.mkdirSync(backupDir, {recursive: true});
  for (const d of ["config"]) {
    const src = path.join(home, d);
    if (fs.existsSync(src)) fs.cpSync(src, path.join(backupDir, d), {recursive: true});
  }
  const logEntries = [];
  for (const p of plan) {
    if (p.op !== "copy") continue;
    const src = path.join(oldDir, p.file);
    const dst = path.join(home, p.to);
    fs.mkdirSync(path.dirname(dst), {recursive: true});
    if (!fs.existsSync(dst)) { fs.copyFileSync(src, dst); logEntries.push({from: p.file, to: p.to, sha256: p.sha256}); }
  }
  writeJson(path.join(home, "work", "migration-log.json"), {appliedAt: new Date().toISOString(), backupDir, copied: logEntries});
  log(`migrate: APPLY selesai, ${logEntries.length} file disalin. Folder lama TIDAK diubah.`);
  return {planPath, applied: true, copied: logEntries.length};
}
