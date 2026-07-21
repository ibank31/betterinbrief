#!/usr/bin/env python3
"""BinB Kokoro TTS - dijalankan di Debian proot, Python 3.12 (uv venv).
Dipanggil oleh pipeline; jangan jalankan manual kecuali untuk debug."""
import argparse
import sys


def main() -> int:
    ap = argparse.ArgumentParser(description="BinB Kokoro TTS")
    ap.add_argument("--text", required=True)
    ap.add_argument("--voice", required=True)
    ap.add_argument("--speed", type=float, default=1.0)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    try:
        import numpy as np
        import soundfile as sf
        from kokoro import KPipeline
    except ImportError as exc:
        print(f"ERROR: dependency Kokoro belum terpasang ({exc}). "
              "Jalankan installer/03-install-kokoro.sh", file=sys.stderr)
        return 2

    lang_code = args.voice[0]  # 'a' = American English, 'b' = British
    pipeline = KPipeline(lang_code=lang_code)
    chunks = []
    for _, _, audio in pipeline(args.text, voice=args.voice, speed=args.speed):
        chunks.append(audio)
    if not chunks:
        print("ERROR: Kokoro tidak menghasilkan audio", file=sys.stderr)
        return 3
    audio = np.concatenate(chunks)
    peak = float(np.max(np.abs(audio))) if audio.size else 0.0
    if peak == 0.0:
        print("ERROR: audio kosong/senyap total", file=sys.stderr)
        return 4
    if peak > 0.99:  # cegah clipping sebelum mixing
        audio = audio * (0.98 / peak)
    sf.write(args.out, audio, 24000)
    print(f"OK {args.out} ({audio.shape[0] / 24000:.2f}s, peak {peak:.3f})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
