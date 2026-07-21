import fs from "node:fs";
import path from "node:path";
import {P, readJson, sha256File, writeJson, log} from "../cli/lib/util.mjs";

export function packageEpisode(id, buildManifest) {
  const workDir = P.work(id);
  const qc = readJson(path.join(workDir, "qc-report.json"));
  const locked = readJson(P.lockedJson(id));

  if (qc.verdict !== "PASS") {
    const failedDir = path.join(P.work(""), "..", "work", "failed-builds", `${id}-${Date.now()}`);
    fs.mkdirSync(failedDir, {recursive: true});
    for (const f of ["qc-report.json", "qc-summary.txt", "render-content-manifest.json", "compile-manifest.json", "tts-manifest.json", "mix-manifest.json", "render-manifest.json", "encode-manifest.json"]) {
      const src = path.join(workDir, f);
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(failedDir, f));
    }
    const reasons = qc.checks.filter((c) => c.status === "fail").map((c) => `${c.group}/${c.id}: ${c.detail}`);
    throw new Error(`QC GAGAL - paket Publish Ready TIDAK dibuat.\nDiagnostik disimpan di ${failedDir}\nAlasan:\n- ${reasons.join("\n- ")}`);
  }

  const pubDir = P.publish(id);
  fs.mkdirSync(pubDir, {recursive: true});
  const copies = [
    [path.join(workDir, "render", `${id}-publish-ready.mp4`), `${id}-publish-ready.mp4`],
    [P.lockedJson(id), "episode.locked.json"],
    [path.join(workDir, "compile-manifest.json"), "compile-manifest.json"],
    [path.join(workDir, "tts-manifest.json"), "tts-manifest.json"],
    [path.join(workDir, "mix-manifest.json"), "mix-manifest.json"],
    [path.join(workDir, "render-content-manifest.json"), "render-content-manifest.json"],
    [path.join(workDir, "qc-report.json"), "qc-report.json"],
    [path.join(workDir, "qc-summary.txt"), "qc-summary.txt"],
    [path.join(workDir, "qc", "contact-sheet.jpg"), "contact-sheet.jpg"],
    [path.join(workDir, "qc", "cover.jpg"), "cover.jpg"],
  ];
  for (const [src, name] of copies) {
    if (!fs.existsSync(src)) throw new Error(`Artefak wajib hilang: ${src}`);
    fs.copyFileSync(src, path.join(pubDir, name));
  }
  writeJson(path.join(pubDir, "publishing-copy.json"), {
    episodeId: id, title: locked.title, ...locked.packaging,
    note: "Upload manual ke YouTube Shorts / Instagram Reels / TikTok. Tidak ada uploader otomatis.",
  });
  writeJson(path.join(pubDir, "build-manifest.json"), buildManifest);

  const entries = fs.readdirSync(pubDir).filter((f) => f !== "SHA256SUMS.txt").sort();
  const sums = entries.map((f) => `${sha256File(path.join(pubDir, f))}  ${f}`).join("\n");
  fs.writeFileSync(path.join(pubDir, "SHA256SUMS.txt"), `${sums}\n`);
  log(`package: Publish Ready -> ${pubDir}`);
  return {pubDir, files: [...entries, "SHA256SUMS.txt"]};
}
