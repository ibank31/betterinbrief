import React from "react";
import {interpolate, useCurrentFrame} from "remotion";
import {colors, motion, safeZones, typography} from "../brand/tokens";
import {EditorialFrame, EditorialSubtitle, Eyebrow, SceneBaseProps, clamp} from "./shared";

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
  return <EditorialFrame background={colors.warmWhite} world={world} surface={surface}>
    <div style={{position: "absolute", left: safeZones.left, top: safeZones.top, width: 880}}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <div style={{marginTop: 94, width: 640, fontSize: typography.size.display, lineHeight: typography.lineHeight.display, letterSpacing: typography.letterSpacing.display, fontWeight: typography.weight.black, color: colors.gray700, textDecoration: "line-through", textDecorationColor: colors.orange, textDecorationThickness: 14, opacity: .92}}>{misconception}</div>
      <div style={{position: "absolute", right: 18, top: 190, fontSize: 190, lineHeight: 1, fontWeight: typography.weight.black, color: colors.orange, transform: `rotate(${(1-cut)*12}deg) scale(${.8+.2*cut})`, opacity: cut}}>{symbol}</div>
      <div style={{marginTop: 128, marginLeft: 96, maxWidth: 760, fontSize: 96, lineHeight: typography.lineHeight.hero, letterSpacing: typography.letterSpacing.tight, fontWeight: typography.weight.black, opacity: answer, transform: `translateY(${(1-answer)*50}px)`}}>{correction}</div>
    </div>
    <div style={{position: "absolute", left: 0, top: 1040, height: 18, width: `${cut*790}px`, background: colors.orange}}/>
    <EditorialSubtitle text={subtitle}/>
  </EditorialFrame>;
};
