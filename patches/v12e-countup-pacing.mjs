import fs from "node:fs";
import path from "node:path";

const ROOT = process.env.BINB_APP_ROOT || "/opt/binb";

const plans = [
  {
    file: "app/remotion/src/scenes/HookScene.tsx",
    requires: ["countProgress", "displayStatistic"],
    ops: [
      {
        find: "di ~0.9 detik pertama agar frame",
        replace: "di ~1.3 detik pertama agar frame",
      },
      {
        find: "const countProgress = interpolate(frame, [0, 26], [0, 1], clamp);",
        replace: "const countProgress = interpolate(frame, [0, 38], [0, 1], clamp);",
      },
      {
        find: "const countEased = 1 - Math.pow(1 - countProgress, 3);",
        replace: "const countEased = 1 - Math.pow(1 - countProgress, 2);",
      },
    ],
  },
  {
    file: "app/pipeline/render.mjs",
    ops: [
      {find: "chunked-v4", replace: "chunked-v5"},
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
      failures.push(plan.file + ": penanda tidak ditemukan - struktur file berbeda dari cetak biru");
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
  fs.writeFileSync(r.abs + ".bak-v12e", fs.readFileSync(r.abs));
  fs.writeFileSync(r.abs, r.text);
  console.log("OK " + r.rel);
}
console.log("v1.2e count-up pacing diterapkan (backup: *.bak-v12e).");
