import path from "node:path";
import fs from "node:fs";
import {P, writeJson, log} from "../cli/lib/util.mjs";
import {qcTechnical} from "./technical.mjs";
import {qcContent} from "./content.mjs";
import {qcVisual} from "./visual.mjs";

export function runQc(id) {
  const workDir = P.work(id);
  const tech = qcTechnical(id);
  const content = qcContent(id);
  const visual = qcVisual(id);
  const all = [
    ...tech.checks.map((c) => ({group: "technical", ...c})),
    ...content.checks.map((c) => ({group: "content", ...c})),
    ...visual.checks.map((c) => ({group: "visual", ...c})),
  ];
  const fails = all.filter((c) => c.status === "fail");
  const warns = all.filter((c) => c.status === "warn");
  const report = {
    episodeId: id, ranAt: new Date().toISOString(),
    verdict: fails.length === 0 ? "PASS" : "FAIL",
    counts: {pass: all.filter((c) => c.status === "pass").length, warn: warns.length, fail: fails.length},
    measured: tech.measured || null,
    checks: all,
    artifacts: {contactSheet: visual.contactSheet, cover: visual.cover, stills: visual.stills},
  };
  writeJson(path.join(workDir, "qc-report.json"), report);

  const lines = [];
  lines.push(`BinB QC - ${id}`);
  lines.push(`Hasil: ${report.verdict} (${report.counts.pass} pass, ${report.counts.warn} warning, ${report.counts.fail} fail)`);
  lines.push("");
  for (const c of all) {
    const mark = c.status === "pass" ? "[OK]  " : c.status === "warn" ? "[WARN]" : "[FAIL]";
    lines.push(`${mark} ${c.group}/${c.id}: ${c.detail}`);
  }
  fs.writeFileSync(path.join(workDir, "qc-summary.txt"), `${lines.join("\n")}\n`);
  log(`qc: ${id} -> ${report.verdict} (${fails.length} fail, ${warns.length} warning)`);
  return report;
}
