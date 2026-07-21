// speech-text.mjs — Normalisasi teks narasi menjadi "spoken form" untuk Kokoro TTS.
//
// Kokoro membaca prosodi HANYA dari tanda baca + pemilihan voice. Frontend misaki
// menangani pola umum, tapi angka/tahun/mata uang/simbol sering salah baca
// (mis. 1999 -> "one thousand nine hundred ninety-nine"). Modul ini mengubah
// narasi tampilan menjadi bentuk ucapan native sebelum sintesis:
//   - Tahun 1100-2099 -> "nineteen ninety-nine", "twenty twenty-six"
//   - $2,000 / $1.5 million -> "two thousand dollars" / "one point five million dollars"
//   - 67% -> "sixty-seven percent"; 3-5 -> "three to five"; 2.5 -> "two point five"
//   - Integer polos -> kata (sampai miliaran)
//   - & -> and; vs. -> versus; e.g. -> for example; i.e. -> that is; etc. -> et cetera
//   - Buang emoji & tag SSML (Kokoro membacanya literal), rapikan !!!/??? -> !/?
//   - Pastikan diakhiri tanda baca final agar intonasi menutup natural.
// Teks di layar TETAP memakai digit; hanya input TTS yang dinormalisasi.

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function twoDigitsToWords(n) {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o ? `${TENS[t]}-${ONES[o]}` : TENS[t];
}

function threeDigitsToWords(n) {
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (!h) return twoDigitsToWords(r);
  return r ? `${ONES[h]} hundred ${twoDigitsToWords(r)}` : `${ONES[h]} hundred`;
}

export function integerToWords(n) {
  if (!Number.isFinite(n) || n < 0 || n > 999_999_999_999) return null;
  if (n === 0) return "zero";
  const scales = [[1_000_000_000, "billion"], [1_000_000, "million"], [1_000, "thousand"]];
  const parts = [];
  let rest = n;
  for (const [value, name] of scales) {
    if (rest >= value) {
      parts.push(`${threeDigitsToWords(Math.floor(rest / value))} ${name}`);
      rest %= value;
    }
  }
  if (rest) parts.push(threeDigitsToWords(rest));
  return parts.join(" ");
}

function yearToWords(y) {
  if (y === 2000) return "two thousand";
  if (y % 100 === 0) return `${twoDigitsToWords(y / 100)} hundred`;
  if (y > 2000 && y < 2010) return `two thousand ${ONES[y % 100]}`;
  const head = twoDigitsToWords(Math.floor(y / 100));
  const tail = y % 100;
  return tail < 10 ? `${head} oh ${ONES[tail]}` : `${head} ${twoDigitsToWords(tail)}`;
}

function decimalToWords(whole, frac) {
  const w = integerToWords(parseInt(whole, 10));
  if (w === null) return null;
  const digits = frac.split("").map((d) => ONES[parseInt(d, 10)]).join(" ");
  return `${w} point ${digits}`;
}

const SCALE_WORDS = {k: "thousand", m: "million", b: "billion", thousand: "thousand", million: "million", billion: "billion", trillion: "trillion"};

export function normalizeSpeechText(input) {
  const changes = [];
  const swap = (text, regex, replacer) =>
    text.replace(regex, (...args) => {
      const out = replacer(...args);
      if (out !== args[0]) changes.push({from: args[0], to: out});
      return out;
    });

  let t = String(input);

  // 1. Buang emoji dan tag SSML/markup (Kokoro membaca literal).
  t = swap(t, /<[^>\n]{1,60}>/g, () => " ");
  t = swap(t, /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, () => "");

  // 2. Rapikan tanda baca bertumpuk (satu ! sudah maksimal untuk Kokoro).
  t = swap(t, /!{2,}/g, () => "!");
  t = swap(t, /\?{2,}/g, () => "?");

  // 3. Singkatan umum -> bentuk ucapan.
  t = swap(t, /\bvs\.?\b/gi, () => "versus");
  t = swap(t, /\be\.g\.,?\s*/gi, () => "for example, ");
  t = swap(t, /\bi\.e\.,?\s*/gi, () => "that is, ");
  t = swap(t, /\betc\.?\b/gi, () => "et cetera");
  t = swap(t, /\s&\s/g, () => " and ");

  // 4. Mata uang: $1,500 / $1.5 million / $2000/1M.
  t = swap(t, /\$\s?(\d[\d,]*(?:\.\d+)?)(?:\s*(thousand|million|billion|trillion|[kKmMbB])\b)?/g,
    (match, num, scale) => {
      const clean = num.replace(/,/g, "");
      let words;
      if (clean.includes(".")) {
        const [w, f] = clean.split(".");
        words = decimalToWords(w, f);
      } else {
        words = integerToWords(parseInt(clean, 10));
      }
      if (words === null) return match;
      const scaleWord = scale ? SCALE_WORDS[scale.toLowerCase()] : null;
      return scaleWord ? `${words} ${scaleWord} dollars` : `${words} dollars`;
    });

  // 5. Persen: 67% -> sixty-seven percent.
  t = swap(t, /(\d[\d,]*(?:\.\d+)?)\s?%/g, (match, num) => {
    const clean = num.replace(/,/g, "");
    const words = clean.includes(".")
      ? decimalToWords(...clean.split("."))
      : integerToWords(parseInt(clean, 10));
    return words === null ? match : `${words} percent`;
  });

  // 6. Rentang angka: 3-5 -> three to five.
  t = swap(t, /\b(\d{1,4})\s?[-\u2013]\s?(\d{1,4})\b/g, (match, a, b) => {
    const wa = integerToWords(parseInt(a, 10));
    const wb = integerToWords(parseInt(b, 10));
    return wa && wb ? `${wa} to ${wb}` : match;
  });

  // 7. Tahun: 1100-2099 (empat digit berdiri sendiri).
  t = swap(t, /\b(1[1-9]\d{2}|20\d{2})\b/g, (match, y) => yearToWords(parseInt(y, 10)));

  // 8. Desimal: 2.5 -> two point five.
  t = swap(t, /\b(\d+)\.(\d+)\b/g, (match, w, f) => decimalToWords(w, f) ?? match);

  // 9. Integer polos (termasuk pemisah ribuan).
  t = swap(t, /\b\d{1,3}(?:,\d{3})+\b|\b\d+\b/g, (match) => {
    const words = integerToWords(parseInt(match.replace(/,/g, ""), 10));
    return words === null ? match : words;
  });

  // 10. Rapikan spasi; pastikan penutup kalimat final.
  t = t.replace(/[ \t]{2,}/g, " ").replace(/ +([,.;:!?])/g, "$1").trim();
  if (t && !/[.!?\u2026]$/.test(t)) {
    changes.push({from: "(tanpa penutup)", to: "tambah titik akhir"});
    t = `${t}.`;
  }

  return {text: t, changes};
}
