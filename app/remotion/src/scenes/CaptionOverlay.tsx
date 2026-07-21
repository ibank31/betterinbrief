/**
 * Kinetic captions — satu-satunya lapisan narasi di layar.
 * Kata muncul satu per satu mengikuti perkiraan tempo bicara; kata aktif
 * di-highlight. Layout stabil: semua kata dirender sejak awal cue dengan
 * opacity 0 sehingga line-wrap tidak melompat saat kata muncul.
 */
import React from "react";
import {interpolate, useCurrentFrame} from "remotion";
import {colors, typography} from "../brand/tokens";

export type CaptionCue = {
  startFrame: number;
  endFrame: number;
  text: string;
  accent?: string;
  accentColor?: string;
  surface?: "dark" | "light" | "orange";
};

export type CaptionOverlayProps = {
  cues: readonly CaptionCue[];
};

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

type WordTiming = {word: string; at: number};

// Bagi durasi cue ke tiap kata proporsional dengan panjangnya. Kata terakhir
// selesai muncul di ~70% durasi cue supaya sempat terbaca utuh sebelum ganti.
const wordTimings = (cue: CaptionCue): WordTiming[] => {
  const words = cue.text.trim().split(/\s+/);
  const total = words.reduce((acc, w) => acc + w.length + 1, 0) || 1;
  const window = Math.max(1, (cue.endFrame - cue.startFrame) * 0.7);
  let acc = 0;
  return words.map((word) => {
    const at = cue.startFrame + (acc / total) * window;
    acc += word.length + 1;
    return {word, at};
  });
};

export const CaptionOverlay: React.FC<CaptionOverlayProps> = ({cues}) => {
  const frame = useCurrentFrame();
  const cue = cues.find(
    (item) => frame >= item.startFrame && frame < item.endFrame,
  );
  if (!cue) {
    return null;
  }

  const timings = wordTimings(cue);
  const onLight = cue.surface === "light";
  const onOrange = cue.surface === "orange";
  const baseColor = onLight || onOrange ? colors.black : colors.white;
  const hotColor = onOrange ? colors.white : colors.orange;

  let activeIndex = 0;
  for (let i = 0; i < timings.length; i++) {
    if (frame >= timings[i].at) activeIndex = i;
  }

  const cueOut = interpolate(
    frame,
    [cue.endFrame - 3, cue.endFrame - 1],
    [1, 0],
    clamp,
  );

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 1000,
        left: 72,
        bottom: 340,
        width: 880,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "baseline",
        columnGap: 17,
        rowGap: 8,
        pointerEvents: "none",
        opacity: cueOut,
        fontFamily: typography.family,
      }}
    >
      {timings.map((t, i) => {
        const pop = interpolate(frame, [t.at, t.at + 5], [0, 1], clamp);
        const isActive = i === activeIndex && frame < cue.endFrame - 5;
        return (
          <span
            key={`${cue.startFrame}-${i}`}
            style={{
              display: "inline-block",
              fontSize: 56,
              lineHeight: 1.12,
              fontWeight: 900,
              letterSpacing: -1.4,
              color: isActive ? hotColor : baseColor,
              opacity: pop,
              transform: `translateY(${(1 - pop) * 20}px) scale(${0.88 + 0.12 * pop})`,
            }}
          >
            {t.word}
          </span>
        );
      })}
    </div>
  );
};
