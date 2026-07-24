import React from "react";
import {interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {colors, motion, safeZones, typography} from "../brand/tokens";
import {EditorialFrame, Eyebrow, SceneBaseProps, clamp, microBeat} from "./shared";
import {NarrativeDevice} from "../visual/NarrativeDevice";

export type ComparisonSceneProps = SceneBaseProps & {
  eyebrow: string;
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
  verdict: string;
};

// Auto-fit: ukuran font menyesuaikan panjang teks agar tidak pernah overflow
// dari kolomnya (perbaikan bug "JUDGME" terpotong).
const fitFont = (text: string, maxSize: number, width: number): number =>
  Math.min(maxSize, Math.floor(width / (Math.max(1, text.length) * 0.62)));

// v1.3b: angka asli diekstrak dari nilai perbandingan agar batang & device
// jujur-data. Nilai non-numerik memakai proporsi metafora default.
const numFrom = (text: string): number | null => {
  const match = text.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
};

export const ComparisonScene: React.FC<ComparisonSceneProps> = ({eyebrow, leftLabel, leftValue, rightLabel, rightValue, verdict, world, surface}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const leftIn = spring({frame: frame - 2, fps, config: motion.spring.editorial});
  const rightIn = spring({frame: frame - 9, fps, config: motion.spring.tight});
  const barGrow = interpolate(frame, [12, 46], [0, 1], clamp);
  const verdictIn = interpolate(frame, [26, 40], [0, 1], clamp);
  // v1.3d: micro-beat — kolom hero berdenyut, kolom kiri bergoyang di fase
  // berlawanan, garis aksen verdict memanjang mengikuti denyut hero.
  const beatHero = microBeat(frame, {start: 64, period: 82});
  const beatLeft = microBeat(frame, {start: 64, period: 82, phase: 41});
  const leftSize = fitFont(leftValue, 92, 380);
  const rightSize = fitFont(rightValue, 128, 460);
  const leftNum = numFrom(leftValue);
  const rightNum = numFrom(rightValue);
  const scaleMax = leftNum !== null && rightNum !== null ? Math.max(leftNum, rightNum) : null;
  const leftPct = scaleMax !== null && scaleMax > 0 && leftNum !== null ? Math.max(8, (leftNum / scaleMax) * 100) : 34;
  const rightPct = scaleMax !== null && scaleMax > 0 && rightNum !== null ? Math.max(8, (rightNum / scaleMax) * 100) : 100;
  return (
    <EditorialFrame background={colors.white} world={world} surface={surface}>
      <NarrativeDevice kind={world?.device ?? "decision_graph"} surface={surface ?? "light"} seed={world?.seed} data={leftNum !== null && rightNum !== null ? {values: [leftNum, rightNum], highlightIndex: 1} : undefined} />
      <div style={{position: "absolute", left: safeZones.left, top: safeZones.top, width: 880}}>
        <Eyebrow>{eyebrow}</Eyebrow>
      </div>
      {/* Jalur kiri: yang dikomoditisasi (kecil, abu-abu) */}
      <div style={{position: "absolute", left: safeZones.left, top: 330, width: 390, opacity: leftIn, transform: `translateX(${(1 - leftIn) * -60}px) translateY(${beatLeft * -5}px)`}}>
        <div style={{fontSize: typography.size.caption, fontWeight: typography.weight.bold, letterSpacing: typography.letterSpacing.wideLabel, color: colors.gray500}}>{leftLabel}</div>
        <div style={{marginTop: 30, fontSize: leftSize, lineHeight: 0.96, fontWeight: typography.weight.black, letterSpacing: -2.4, color: colors.gray700}}>{leftValue}</div>
        <div style={{marginTop: 56, width: 20, height: 320, background: colors.gray100, position: "relative", overflow: "hidden"}}>
          <div style={{position: "absolute", bottom: 0, width: "100%", height: `${barGrow * leftPct}%`, background: colors.gray500}} />
        </div>
      </div>
      {/* Jalur kanan: hero (besar, orange) */}
      <div style={{position: "absolute", left: 528, top: 300, width: 470, opacity: rightIn, transform: `translateY(${(1 - rightIn) * 70}px) scale(${1 + beatHero * 0.018})`, transformOrigin: "left bottom"}}>
        <div style={{fontSize: typography.size.caption, fontWeight: typography.weight.bold, letterSpacing: typography.letterSpacing.wideLabel, color: colors.orange}}>{rightLabel}</div>
        <div style={{marginTop: 30, fontSize: rightSize, lineHeight: 0.96, fontWeight: typography.weight.black, letterSpacing: -3, color: colors.orange}}>{rightValue}</div>
        <div style={{marginTop: 48, width: 28, height: 430, background: colors.orange16, position: "relative", overflow: "hidden"}}>
          <div style={{position: "absolute", bottom: 0, width: "100%", height: `${barGrow * rightPct}%`, background: colors.orange}} />
        </div>
      </div>
      {/* Verdict dengan aksen sweep */}
      <div style={{position: "absolute", left: safeZones.left, top: 1020, width: 880, opacity: verdictIn, transform: `translateY(${(1 - verdictIn) * 30}px)`}}>
        <div style={{width: 120 + beatHero * 46, height: 12, background: colors.orange, marginBottom: 26}} />
        <div style={{fontSize: 76, lineHeight: 1.0, fontWeight: typography.weight.black, letterSpacing: -2.6, color: colors.black}}>{verdict}</div>
      </div>
    </EditorialFrame>
  );
};
