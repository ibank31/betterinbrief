import fs from "node:fs";
const p = "/sdcard/BinB_Studio/BetterInBrief/episodes/Seed_004/episode.json";
const ep = JSON.parse(fs.readFileSync(p, "utf8"));
const set = (sceneId, assets) => {
  const scene = ep.scenes.find((s) => s.id === sceneId);
  if (!scene) { console.error(sceneId + " tidak ditemukan"); process.exit(1); }
  scene.visualAssets = assets;
};
set("S01", [
  {
    assetId: "A01",
    role: "context",
    kind: "stock_media",
    rightsStatus: "permission_verified",
    file: "assets/S01-backdrop.mp4",
    treatment: "hero",
    editorialPurpose: "Hero footage pekerja kantor untuk hook - mendukung klaim gap 62% di dunia kerja nyata",
    licenseUrl: "https://www.pexels.com/license/",
    fetch: {provider: "pexels", type: "video", query: "busy office workers typing laptop documents"}
  }
]);
set("S03", [
  {
    assetId: "A01",
    role: "context",
    kind: "stock_media",
    rightsStatus: "permission_verified",
    file: "assets/S03-backdrop.mp4",
    treatment: "backdrop",
    editorialPurpose: "Backdrop halus scene perbandingan - mendukung klaim premi gaji 62% bagi pekerja yang belajar skill AI",
    licenseUrl: "https://www.pexels.com/license/",
    fetch: {provider: "pexels", type: "video", query: "person taking notes laptop studying online course"}
  }
]);
fs.writeFileSync(p, JSON.stringify(ep, null, 2));
console.log("OK: S01 hero + S03 backdrop tersuntik ke Seed_004");
