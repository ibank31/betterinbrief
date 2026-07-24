import React from "react";
import {interpolate, useCurrentFrame} from "remotion";
import {colors, motion, safeZones, typography} from "../brand/tokens";
import {EditorialFrame, EditorialSubtitle, Eyebrow, SceneBaseProps, SourceLine, clamp} from "./shared";
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
  return <EditorialFrame background={colors.black} color={colors.white} world={world} surface={surface}>
    <NarrativeDevice kind={world?.device ?? "evidence_scan"} surface={surface ?? "dark"} seed={world?.seed} data={{values: [value], max: suffix === "%" ? 100 : undefined}} />
    <div style={{position: "absolute", left: safeZones.left, top: safeZones.top, width: 880}}>
      <Eyebrow color={colors.gray300}>{eyebrow}</Eyebrow>
      <div style={{marginTop: 114, fontSize: 280, lineHeight: .78, fontWeight: typography.weight.black, letterSpacing: -14, color: colors.white}}>{shown}<span style={{fontSize: 110, color: colors.orange, marginLeft: 14}}>{suffix}</span></div>
      <div style={{marginTop: 82, maxWidth: 720, fontSize: typography.size.title, lineHeight: typography.lineHeight.title, fontWeight: typography.weight.bold}}>{label}</div>
      <div style={{marginTop: 108, width: 880, height: 34, background: colors.charcoal, overflow: "hidden"}}>
        <div style={{width: `${Math.min(100, (progress * value / barMax) * 100)}%`, minWidth: progress ? 14 : 0, height: "100%", background: colors.orange}}/>
      </div>
      <div style={{display: "flex", justifyContent: "space-between", marginTop: 16, fontSize: typography.size.source, color: colors.gray300, fontWeight: typography.weight.semibold}}><span>0</span><span>{`${Math.round(barMax)}${suffix}`}</span></div>
    </div>
    <SourceLine color={colors.gray300}>{source}</SourceLine>
    <EditorialSubtitle text={subtitle} color={colors.white72}/>
  </EditorialFrame>;
};
