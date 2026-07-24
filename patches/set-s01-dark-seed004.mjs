import fs from "node:fs";

const file = "/sdcard/BinB_Studio/BetterInBrief/episodes/Seed_004/episode.json";
const ep = JSON.parse(fs.readFileSync(file, "utf8"));
const scene = (ep.scenes || []).find((s) => s.id === "S01");
if (!scene) {
  console.error("DIBATALKAN: scene S01 tidak ditemukan di episode.json");
  process.exit(1);
}
console.log("S01 surface sebelumnya: " + (scene.surface || "(tidak diset / default light)"));
scene.surface = "dark";
fs.writeFileSync(file + ".bak-s01dark", JSON.stringify(JSON.parse(fs.readFileSync(file, "utf8")), null, 2) + "\n");
fs.writeFileSync(file, JSON.stringify(ep, null, 2) + "\n");
console.log("OK: S01 surface -> dark (backup: episode.json.bak-s01dark)");
