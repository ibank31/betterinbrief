// Dipanggil workflow HANYA saat build gagal: kirim ekor build.log ke D1
// (tabel build_logs) supaya agent bisa membaca penyebab kegagalan tanpa
// akses log Actions. Non-fatal total: kegagalan pelaporan tidak boleh
// menutupi kegagalan build aslinya.
import fs from "node:fs";

const token = process.env.CLOUDFLARE_API_TOKEN;
if (!token) {
  console.log("report-failure: CLOUDFLARE_API_TOKEN tidak ada, lewati");
  process.exit(0);
}
let tail = "build.log tidak ditemukan";
try {
  tail = fs.readFileSync("build.log", "utf8").slice(-6000);
} catch {}
const acc = "2336f3c9ddcd5227f2493258fc355327";
const db = "8a8e7905-f3f2-49e6-9ecf-d7be35702871";
const url = "https://api.cloudflare.com/client/v4/accounts/" + acc + "/d1/database/" + db + "/query";
try {
  const res = await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json", "Authorization": "Bearer " + token},
    body: JSON.stringify({
      sql: "INSERT INTO build_logs (run_number, commit_sha, episode_id, logged_at, log_tail) VALUES (?,?,?,?,?)",
      params: [Number(process.env.GITHUB_RUN_NUMBER || 0), process.env.GITHUB_SHA || "", process.env.EPISODE || "", new Date().toISOString(), tail],
    }),
  });
  console.log("report-failure: D1 status " + res.status);
} catch (e) {
  console.log("report-failure: gagal kirim (" + e.message + "), lewati");
}
