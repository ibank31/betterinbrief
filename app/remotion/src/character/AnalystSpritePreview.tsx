import React from "react";
import {AbsoluteFill, Sequence, useCurrentFrame} from "remotion";
import {colors, typography} from "../brand/tokens";
import {AnalystAnchor, AnalystExpressionSprite, AnalystGestureSprite} from "./AnalystSprite";
import type {AnalystExpression, AnalystGesture} from "./character-sprite-types";

const expressions: readonly AnalystExpression[] = ["neutral-observation", "eyes-glance-to-data", "eyebrow-rise", "micro-smile-card"];
const gestures: readonly AnalystGesture[] = ["card-edge-tap", "two-point-connection", "card-held-close"];

export const AnalystSpritePreview: React.FC = () => {
  const frame = useCurrentFrame();
  const expressionIndex = Math.min(expressions.length - 1, Math.floor(Math.max(0, frame - 120) / 40));
  const gestureIndex = Math.min(gestures.length - 1, Math.floor(Math.max(0, frame - 280) / 40));
  const phase = frame < 120 ? "IDENTITY ANCHOR" : frame < 280 ? "EXPRESSION SYSTEM" : "CARD GESTURES";
  return (
    <AbsoluteFill style={{backgroundColor: colors.graphite, color: colors.white, fontFamily: typography.family}}>
      <div style={{position: "absolute", left: 72, top: 105, right: 72}}>
        <div style={{fontSize: 24, fontWeight: 800, letterSpacing: 4, color: colors.gray300}}>BETTER IN BRIEF · LOCKED CHARACTER</div>
        <div style={{marginTop: 22, fontSize: 78, lineHeight: 0.96, fontWeight: 900, letterSpacing: -2.5}}>THE ANALYST<br/><span style={{color: colors.orange}}>SPRITE SYSTEM V1</span></div>
        <div style={{marginTop: 30, width: 640, height: 7, backgroundColor: colors.orange}} />
        <div style={{marginTop: 22, fontSize: 25, fontWeight: 800, letterSpacing: 3, color: colors.gray300}}>{phase}</div>
      </div>
      <Sequence from={0} durationInFrames={120}>
        <div style={{position: "absolute", right: 55, bottom: 275}}><AnalystAnchor width={720} /></div>
      </Sequence>
      <Sequence from={120} durationInFrames={160}>
        <div style={{position: "absolute", left: 92, right: 92, top: 510, bottom: 360, border: `3px solid ${colors.white20}`, backgroundColor: colors.warmWhite, display: "grid", placeItems: "center", overflow: "hidden"}}>
          <AnalystExpressionSprite expression={expressions[expressionIndex]} startFrame={expressionIndex * 40} width={650} />
        </div>
        <div style={{position: "absolute", left: 92, bottom: 245, fontSize: 34, fontWeight: 900, color: colors.orange, textTransform: "uppercase"}}>{expressions[expressionIndex].replaceAll("-", " ")}</div>
      </Sequence>
      <Sequence from={280} durationInFrames={120}>
        <div style={{position: "absolute", left: 92, right: 92, top: 610, height: 620, backgroundColor: colors.warmWhite, display: "grid", placeItems: "center", overflow: "hidden"}}>
          <AnalystGestureSprite gesture={gestures[gestureIndex]} startFrame={gestureIndex * 40} width={720} />
        </div>
        <div style={{position: "absolute", left: 92, bottom: 300, fontSize: 34, fontWeight: 900, color: colors.orange, textTransform: "uppercase"}}>{gestures[gestureIndex].replaceAll("-", " ")}</div>
      </Sequence>
      <div style={{position: "absolute", left: 72, right: 72, bottom: 90, paddingTop: 24, borderTop: `3px solid ${colors.white20}`, display: "flex", justifyContent: "space-between", fontSize: 23, fontWeight: 700, color: colors.gray300}}>
        <span>Original locked pixels · no redraw</span><span>MANUAL UPLOAD ONLY</span>
      </div>
    </AbsoluteFill>
  );
};
