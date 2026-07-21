import fs from "node:fs";
import {P, canonicalJson, readJson, sha256Text, writeJson, log} from "../cli/lib/util.mjs";
import {validateEpisode} from "./validate.mjs";

export function lockEpisode(id, {forceRelock = false} = {}) {
  const episode = readJson(P.episodeJson(id));
  const {errors} = validateEpisode(episode);
  if (errors.length) {
    throw new Error(`Episode ${id} belum valid, tidak bisa di-lock:\n- ${errors.join("\n- ")}`);
  }
  const lockedBody = {...episode, status: "locked"};
  const canonical = canonicalJson(lockedBody);
  const sha = sha256Text(canonical);
  const lockedPath = P.lockedJson(id);

  if (fs.existsSync(lockedPath)) {
    const existing = readJson(lockedPath);
    const existingSha = sha256Text(canonicalJson({...existing, locked: undefined}));
    const existingCore = {...existing};
    delete existingCore.locked;
    const coreSha = sha256Text(canonicalJson(existingCore));
    if (coreSha === sha) {
      log(`lock: ${id} sudah terkunci dengan isi identik (${sha.slice(0, 12)}...)`);
      return {sha256: existing.locked.sha256, path: lockedPath, reused: true};
    }
    if (!forceRelock) {
      throw new Error(
        `episode.locked.json untuk ${id} sudah ada dengan isi BERBEDA.\n` +
        `Ini mencegah perubahan diam-diam. Jika perubahan memang disengaja, jalankan: binb lock ${id} --force-relock`);
    }
    fs.copyFileSync(lockedPath, `${lockedPath}.superseded-${Date.now()}`);
    log(`lock: ${id} force-relock, versi lama disimpan sebagai .superseded`);
  }
  const locked = {...lockedBody, locked: {sha256: sha, lockedAt: new Date().toISOString(), lockNote: "Hash dihitung dari isi canonical tanpa blok locked ini."}};
  writeJson(lockedPath, locked);
  log(`lock: ${id} dikunci sha256=${sha.slice(0, 16)}...`);
  return {sha256: sha, path: lockedPath, reused: false};
}

export function lockedCoreSha(locked) {
  const core = {...locked};
  delete core.locked;
  return sha256Text(canonicalJson(core));
}
