import React from "react";
import {AbsoluteFill, useCurrentFrame} from "remotion";
import {colors, typography} from "../brand/tokens";
import {AnalystAnchor} from "./AnalystSprite";

const surfaces = [
  {name: "DARK", background: "#000000", foreground: colors.white},
  {name: "ORANGE", background: colors.orange, foreground: colors.black},
  {name: "WARM WHITE", background: colors.warmWhite, foreground: colors.black},
  {name: "WHITE", background: colors.white, foreground: colors.black},
] as const;

export const AnalystBackgroundQA: React.FC = () => {
  const frame = useCurrentFrame();
  const index = Math.min(surfaces.length - 1, Math.floor(frame / 90));
  const surface = surfaces[index];
  const localFrame = frame - index * 90;

  return (
    <AbsoluteFill style={{backgroundColor: surface.background, color: surface.foreground, fontFamily: typography.family, overflow: "hidden"}}>
      <div style={{position: "absolute", left: 72, right: 72, top: 95, zIndex: 2}}>
        <div style={{fontSize: 24, fontWeight: 800, letterSpacing: 4, opacity: 0.65}}>BETTER IN BRIEF · CHARACTER CUTOUT QA</div>
        <div style={{marginTop: 24, fontSize: 82, lineHeight: 0.96, fontWeight: 900, letterSpacing: -2.8}}>THE ANALYST</div>
        <div style={{marginTop: 18, fontSize: 38, fontWeight: 900, letterSpacing: 2, color: index === 1 ? colors.black : colors.orange}}>{surface.name} SURFACE</div>
      </div>

      <div style={{position: "absolute", left: 105, top: 405, width: 870, height: 1160, display: "flex", alignItems: "flex-end", justifyContent: "center"}}>
        <AnalystAnchor startFrame={index * 90} width={860} />
      </div>

      <div style={{position: "absolute", left: 72, width: 580, bottom: 235, height: 7, backgroundColor: index === 1 ? colors.black : colors.orange}} />

      <div style={{position: "absolute", left: 72, right: 72, bottom: 90, paddingTop: 25, borderTop: `3px solid ${index < 2 ? "rgba(255,255,255,0.24)" : colors.gray300}`, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 23, fontWeight: 800}}>
        <span>FRAME {frame} · LOCAL {localFrame}</span>
        <span>TRANSPARENT CUTOUT · NO PANEL</span>
      </div>
    </AbsoluteFill>
  );
};
