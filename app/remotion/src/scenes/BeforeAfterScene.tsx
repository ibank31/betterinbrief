import React from "react";
import {interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {colors, motion, safeZones, typography} from "../brand/tokens";
import {EditorialFrame, EditorialSubtitle, Eyebrow, SceneBaseProps, clamp, microBeat} from "./shared";
import {NarrativeDevice} from "../visual/NarrativeDevice";

export type BeforeAfterSceneProps = SceneBaseProps & {eyebrow: string; beforeLabel: string; beforeText: string; afterLabel: string; afterText: string};

// Kamus scene v1.4a - before/after: panel keadaan lama masuk dulu, dicoret,
// lalu panel keadaan baru mendarat dengan aksen. Untuk perubahan keadaan
// (dulu vs sekarang), bukan mitos vs fakta (itu wilayah CorrectionScene).
export const BeforeAfterScene: React.FC<BeforeAfterSceneProps> = ({eyebrow, beforeLabel, beforeText, afterLabel, afterText, subtitle, world, surface}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const surf = surface ?? "dark";
  const bg = surf === "dark" ? colors.graphite : surf === "orange" ? colors.orange : colors.white;
  const fg = surf === "dark" ? colors.white : colors.black;
  const accent = surf === "orange" ? colors.white : colors.orange;
  const muted = surf === "dark" ? colors.gray300 : colors.gray700;
  const hairline = surf === "dark" ? colors.gray700 : "rgba(0,0,0,0.24)";
  const beforeIn = spring({frame: frame - 6, fps, config: motion.spring.editorial});
  const strike = interpolate(frame, [26, 40], [0, 1], clamp);
  const afterIn = spring({frame: frame - 36, fps, config: motion.spring.editorial});
  const beat = microBeat(frame, {start: 70, period: 84});
  return <EditorialFrame background={bg} color={fg} world={world} surface={surf}>
    <NarrativeDevice kind={world?.device ?? "two_tracks"} surface={surf} seed={world?.seed} />
    <div style={{position: "absolute", left: safeZones.left, top: safeZones.top, width: 900}}>
      <Eyebrow color={muted}>{eyebrow}</Eyebrow>
      <div style={{position: "relative", marginTop: 64, border: `3px solid ${hairline}`, padding: "44px 48px 48px", opacity: Math.min(1, beforeIn) * (1 - afterIn * 0.35), transform: `translateY(${(1 - beforeIn) * 40}px)`}}>
        <div style={{fontSize: typography.size.caption, fontWeight: typography.weight.bold, letterSpacing: typography.letterSpacing.wideLabel, color: muted, textTransform: "uppercase"}}>{beforeLabel}</div>
        <div style={{marginTop: 26, fontSize: typography.size.body, fontWeight: typography.weight.semibold, lineHeight: 1.24, maxWidth: 800}}>{beforeText}</div>
        <div style={{position: "absolute", left: 34, right: 34, top: "56%", height: 10, background: accent, opacity: 0.85, transform: `rotate(-4deg) scaleX(${strike})`, transformOrigin: "left center"}} />
      </div>
      <div style={{marginTop: 42, border: `4px solid ${accent}`, background: surf === "orange" ? "rgba(255,255,255,0.14)" : colors.orange16, padding: "48px 48px 52px", opacity: Math.min(1, afterIn), transform: `translateY(${(1 - afterIn) * 52}px) scale(${1 + 0.012 * beat})`, transformOrigin: "center top"}}>
        <div style={{fontSize: typography.size.caption, fontWeight: typography.weight.bold, letterSpacing: typography.letterSpacing.wideLabel, color: accent, textTransform: "uppercase"}}>{afterLabel}</div>
        <div style={{marginTop: 26, fontSize: typography.size.body, fontWeight: typography.weight.black, lineHeight: 1.22, maxWidth: 800}}>{afterText}</div>
      </div>
    </div>
    <EditorialSubtitle text={subtitle} color={colors.white72} accent="before_after" />
  </EditorialFrame>;
};
