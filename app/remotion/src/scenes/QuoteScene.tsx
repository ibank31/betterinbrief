import React from "react";
import {spring, useCurrentFrame, useVideoConfig} from "remotion";
import {colors, motion, safeZones, typography} from "../brand/tokens";
import {EditorialFrame, EditorialSubtitle, Eyebrow, SceneBaseProps, SourceLine, microBeat} from "./shared";
import {NarrativeDevice} from "../visual/NarrativeDevice";

export type QuoteSceneProps = SceneBaseProps & {eyebrow: string; quote: string; attribution: string; source: string};

// Kamus scene v1.4a - quote: kutipan bersumber sebagai momen editorial.
// attribution + source WAJIB (divalidasi katalog) - tidak ada kutipan
// mengambang tanpa sumber di BinB. Glyph kutip besar aksen opacity rendah.
export const QuoteScene: React.FC<QuoteSceneProps> = ({eyebrow, quote, attribution, source, subtitle, world, surface}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const surf = surface ?? "dark";
  const bg = surf === "dark" ? colors.graphite : surf === "orange" ? colors.orange : colors.white;
  const fg = surf === "dark" ? colors.white : colors.black;
  const accent = surf === "orange" ? colors.white : colors.orange;
  const muted = surf === "dark" ? colors.gray300 : colors.gray700;
  const rise = spring({frame: frame - 6, fps, config: motion.spring.editorial});
  const attrIn = spring({frame: frame - 28, fps, config: motion.spring.tight});
  const beat = microBeat(frame, {start: 56, period: 86});
  return <EditorialFrame background={bg} color={fg} world={world} surface={surf}>
    <NarrativeDevice kind={world?.device ?? "evidence_scan"} surface={surf} seed={world?.seed} />
    <div style={{position: "absolute", left: safeZones.left, top: safeZones.top, width: 900}}>
      <Eyebrow color={muted}>{eyebrow}</Eyebrow>
      <div style={{height: 200, position: "relative"}}>
        <div style={{position: "absolute", left: -10, top: -20, fontSize: 300, lineHeight: 1, fontWeight: typography.weight.black, color: accent, opacity: 0.2, transform: `scale(${1 + 0.02 * beat})`, transformOrigin: "left top"}}>{"\u201C"}</div>
      </div>
      <div style={{maxWidth: 880, fontSize: 64, lineHeight: 1.08, fontWeight: typography.weight.black, letterSpacing: -1.2, opacity: Math.min(1, rise), transform: `translateY(${(1 - rise) * 44}px)`}}>{quote}</div>
      <div style={{marginTop: 56, display: "flex", alignItems: "center", gap: 22, opacity: Math.min(1, attrIn), transform: `translateX(${(1 - attrIn) * -30}px)`}}>
        <div style={{width: 74, height: 6, background: accent}} />
        <div style={{fontSize: typography.size.caption, fontWeight: typography.weight.bold, letterSpacing: typography.letterSpacing.wideLabel, color: muted, textTransform: "uppercase"}}>{attribution}</div>
      </div>
    </div>
    <SourceLine color={muted}>{source}</SourceLine>
    <EditorialSubtitle text={subtitle} color={colors.white72} accent="quote" />
  </EditorialFrame>;
};
