import fs from "node:fs";
import path from "node:path";

const ROOT = process.env.BINB_APP_ROOT || "/opt/binb";
const L = (lines) => lines.join("\n");

const plans = [
  {
    file: "app/remotion/src/visual/VisualWorld.tsx",
    requires: ["MediaLayer", "media.treatment"],
    ops: [
      {
        find: '      ? "grayscale(1) contrast(1.06) brightness(" + (surface === "dark" ? "0.72" : "1.02") + ")"',
        replace: '      ? "grayscale(1) contrast(" + (surface === "dark" ? "1.14" : "1.08") + ") brightness(" + (surface === "dark" ? "0.66" : "0.96") + ")"',
      },
      {
        find: L([
          '  const scrim = surface === "dark"',
          '    ? "linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.55) 62%, rgba(0,0,0,0.72) 100%)"',
          '    : "linear-gradient(180deg, rgba(250,247,240,0.40) 0%, rgba(250,247,240,0.68) 62%, rgba(250,247,240,0.82) 100%)";',
        ]),
        replace: L([
          '  const scrim = surface === "dark"',
          '    ? "linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.32) 36%, rgba(0,0,0,0.62) 74%, rgba(0,0,0,0.82) 100%)"',
          '    : "linear-gradient(180deg, rgba(250,247,240,0.32) 0%, rgba(250,247,240,0.26) 36%, rgba(250,247,240,0.70) 74%, rgba(250,247,240,0.88) 100%)";',
          '  const vignette = "radial-gradient(ellipse at center, rgba(0,0,0,0) 52%, rgba(0,0,0,0.38) 100%)";',
        ]),
      },
      {
        find: '    {hero ? <AbsoluteFill style={ {backgroundImage: scrim} } /> : null}',
        replace: L([
          '    {hero ? <AbsoluteFill style={ {backgroundImage: scrim} } /> : null}',
          '    {hero && surface === "dark" ? <AbsoluteFill style={ {backgroundImage: vignette} } /> : null}',
        ]),
      },
    ],
  },
  {
    file: "app/pipeline/render.mjs",
    ops: [
      {find: 'chunked-v3', replace: 'chunked-v4'},
    ],
  },
];

const failures = [];
const results = [];
for (const plan of plans) {
  const abs = path.join(ROOT, plan.file);
  if (!fs.existsSync(abs)) {
    failures.push(plan.file + ": file tidak ditemukan di " + ROOT);
    continue;
  }
  let text = fs.readFileSync(abs, "utf8");
  for (const marker of plan.requires || []) {
    if (!text.includes(marker)) {
      failures.push(plan.file + ": penanda v1.2c tidak ditemukan - jalankan patches/v12c-hero-media.mjs dulu");
    }
  }
  plan.ops.forEach((op, i) => {
    const found = text.split(op.find).length - 1;
    if (found !== 1) {
      failures.push(plan.file + " op#" + (i + 1) + ": ditemukan " + found + "x, diharapkan 1x");
      return;
    }
    text = text.split(op.find).join(op.replace);
  });
  results.push({abs, rel: plan.file, text});
}

if (failures.length > 0) {
  console.error("PATCH DIBATALKAN - tidak ada file yang diubah:");
  for (const f of failures) console.error("- " + f);
  process.exit(1);
}

for (const r of results) {
  fs.writeFileSync(r.abs + ".bak-v12d", fs.readFileSync(r.abs));
  fs.writeFileSync(r.abs, r.text);
  console.log("OK " + r.rel);
}
console.log("v1.2d cinematic hero diterapkan (backup: *.bak-v12d).");
