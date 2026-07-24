import React from "react";
import {interpolate, useCurrentFrame} from "remotion";
import {colors, motion, safeZones, typography} from "../brand/tokens";
import {EditorialFrame, EditorialSubtitle, Eyebrow, SceneBaseProps, clamp} from "./shared";
import {NarrativeDevice} from "../visual/NarrativeDevice";

export type CorrectionSceneProps = SceneBaseProps & {
  eyebrow: string;
  misconception: string;
  correction: string;
  symbol?: string;
};

export const CorrectionScene: React.FC<CorrectionSceneProps> = ({eyebrow, misconception, correction, symbol = "≠", subtitle, world, surface}) => {
  const frame = useCurrentFrame();
  const cut = interpolate(frame, [4, motion.standard], [0, 1], clamp);
  const answer = interpolate(frame, [16, 30], [0, 1], clamp);
  const s = surface ?? "light";
  const ink = s === "dark" ? colors.white : colors.black;
  const bg = s === "dark" ? colors.black : s === "orange" ? colors.orange : colors.warmWhite;
  const accent = s === "orange" ? colors.white : colors.orange;
  const mutedInk = s === "dark" ? colors.gray300 : colors.gray700;
  return <EditorialFrame background={bg} color={ink} world={world} surface={s}>
    <NarrativeDevice kind={world?.device ?? "decision_graph"} surface={s} />
    <div style={{position: "absolute", left: safeZones.left, top: safeZones.top, width: 880}}>
      <Eyebrow color={mutedInk}>{eyebrow}</Eyebrow>
      <div style={{marginTop: 94, width: 640, fontSize: typography.size.display, lineHeight: typography.lineHeight.display, letterSpacing: typography.letterSpacing.display, fontWeight: typography.weight.black, color: mutedInk, textDecoration: "line-through", textDecorationColor: accent, textDecorationThickness: 14, opacity: .92}}>{misconception}</div>
      <div style={{position: "absolute", right: 18, top: 190, fontSize: 190, lineHeight: 1, fontWeight: typography.weight.black, color: accent, transform: `rotate(${(1-cut)*12}deg) scale(${.8+.2*cut})`, opacity: cut}}>{symbol}</div>
      <div style={{marginTop: 128, marginLeft: 96, maxWidth: 760, fontSize: 96, lineHeight: typography.lineHeight.hero, letterSpacing: typography.letterSpacing.tight, fontWeight: typography.weight.black, opacity: answer, transform: `translateY(${(1-answer)*50}px)`}}>{correction}</div>
    </div>
    <div style={{position: "absolute", left: 0, top: 1040, height: 18, width: `${cut*790}px`, background: accent}}/>
    <EditorialSubtitle text={subtitle}/>
  </EditorialFrame>;
};
