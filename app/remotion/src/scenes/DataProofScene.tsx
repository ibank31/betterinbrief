import React from "react";
import {interpolate, useCurrentFrame} from "remotion";
import {colors, motion, safeZones, typography} from "../brand/tokens";
import {EditorialFrame, EditorialSubtitle, Eyebrow, SceneBaseProps, SourceLine, clamp, microBeat} from "./shared";
import {NarrativeDevice} from "../visual/NarrativeDevice";

export type DataProofSceneProps = SceneBaseProps & {
  eyebrow: string;
  value: number;
  decimals?: number;
  suffix?: string;
  label: string;
  source: string;
};

export const DataProofScene: React.FC<DataProofSceneProps> = ({eyebrow, value, decimals = 1, suffix = "%", label, source, subtitle, world, surface}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [6, motion.emphasis], [0, 1], clamp);
  const shown = (value * progress).toFixed(decimals);
  // v1.3b: sumbu jujur-data — skala nyata dari nilai klaim, bukan label dekoratif.
  const barMax = suffix === "%" ? Math.max(100, value) : Math.max(1, value);
  // v1.3d: progressive reveal (label → bar → skala) + micro-beat bergantian
  // pada angka dan bar; scene data tidak lagi membeku setelah count-up.
  const labelIn = interpolate(frame, [10, 24], [0, 1], clamp);
  const scaleIn = interpolate(frame, [34, 46], [0, 1], clamp);
  const beatNumber = microBeat(frame, {start: 60, period: 80});
  const beatBar = microBeat(frame, {start: 60, period: 80, phase: 40});
  return <EditorialFrame background={colors.black} color={colors.white} world={world} surface={surface}>
    <NarrativeDevice kind={world?.device ?? "evidence_scan"} surface={surface ?? "dark"} seed={world?.seed} data={{values: [value], max: suffix === "%" ? 100 : undefined}} />
    <div style={{position: "absolute", left: safeZones.left, top: safeZones.top, width: 880}}>
      <Eyebrow color={colors.gray300}>{eyebrow}</Eyebrow>
      <div style={{marginTop: 114, fontSize: 280, lineHeight: .78, fontWeight: typography.weight.black, letterSpacing: -14, color: colors.white, transform: `scale(${1 + beatNumber * 0.015})`, transformOrigin: "left bottom"}}>{shown}<span style={{fontSize: 110, color: colors.orange, marginLeft: 14}}>{suffix}</span></div>
      <div style={{marginTop: 82, maxWidth: 720, fontSize: typography.size.title, lineHeight: typography.lineHeight.title, fontWeight: typography.weight.bold, opacity: labelIn, transform: `translateY(${(1 - labelIn) * 24}px)`}}>{label}</div>
      <div style={{marginTop: 108, width: 880, height: 34, background: colors.charcoal, overflow: "hidden"}}>
        <div style={{width: `${Math.min(100, (progress * value / barMax) * 100)}%`, minWidth: progress ? 14 : 0, height: "100%", background: colors.orange, transform: `scaleY(${1 + beatBar * 0.22})`, transformOrigin: "center bottom"}}/>
      </div>
      <div style={{display: "flex", justifyContent: "space-between", marginTop: 16, fontSize: typography.size.source, color: colors.gray300, fontWeight: typography.weight.semibold, opacity: scaleIn}}><span>0</span><span>{`${Math.round(barMax)}${suffix}`}</span></div>
    </div>
    <SourceLine color={colors.gray300}>{source}</SourceLine>
    <EditorialSubtitle text={subtitle} color={colors.white72}/>
  </EditorialFrame>;
};
