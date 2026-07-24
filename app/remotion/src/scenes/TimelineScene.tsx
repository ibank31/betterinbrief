import React from "react";
import {spring, useCurrentFrame, useVideoConfig} from "remotion";
import {colors, motion, safeZones, typography} from "../brand/tokens";
import {EditorialFrame, EditorialSubtitle, Eyebrow, SceneBaseProps, microBeat} from "./shared";
import {NarrativeDevice} from "../visual/NarrativeDevice";
import type {TimelineEventItem} from "../episodes/types";

export type TimelineSceneProps = SceneBaseProps & {eyebrow: string; headline: string; events: TimelineEventItem[]};

// Kamus scene v1.4a - timeline vertikal: urutan peristiwa nyata (marker =
// tahun/tanggal dari klaim). Spine tumbuh dengan spring, peristiwa masuk
// bertahap, node berdenyut kecil lewat microBeat supaya tidak ada frame diam.
// Surface-aware: warna teks/aksen mengikuti surface (aksen putih di orange).
export const TimelineScene: React.FC<TimelineSceneProps> = ({eyebrow, headline, events, subtitle, world, surface}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const surf = surface ?? "dark";
  const bg = surf === "dark" ? colors.graphite : surf === "orange" ? colors.orange : colors.white;
  const fg = surf === "dark" ? colors.white : colors.black;
  const accent = surf === "orange" ? colors.white : colors.orange;
  const muted = surf === "dark" ? colors.gray300 : colors.gray700;
  const hairline = surf === "dark" ? colors.gray700 : "rgba(0,0,0,0.24)";
  const rows = events.slice(0, 4);
  const anyHighlight = rows.some((event) => event.highlight === true);
  const spineIn = spring({frame: frame - 8, fps, config: motion.spring.soft});
  return <EditorialFrame background={bg} color={fg} world={world} surface={surf}>
    <NarrativeDevice kind={world?.device ?? "decision_graph"} surface={surf} seed={world?.seed} />
    <div style={{position: "absolute", left: safeZones.left, top: safeZones.top, width: 880}}>
      <Eyebrow color={muted}>{eyebrow}</Eyebrow>
      <div style={{marginTop: 48, maxWidth: 820, fontSize: typography.size.headline, lineHeight: typography.lineHeight.headline, fontWeight: typography.weight.black, letterSpacing: typography.letterSpacing.headline}}>{headline}</div>
      <div style={{position: "relative", marginTop: 68}}>
        <div style={{position: "absolute", left: 10, top: 12, bottom: 12, width: 4, background: hairline, transform: `scaleY(${spineIn})`, transformOrigin: "top"}} />
        {rows.map((event, i) => {
          const p = spring({frame: frame - (14 + i * 7), fps, config: motion.spring.editorial});
          const beat = microBeat(frame, {start: 62, period: 80, phase: i * 9});
          const hot = event.highlight === true || (!anyHighlight && i === rows.length - 1);
          return <div key={event.marker + event.label} style={{display: "flex", alignItems: "flex-start", minHeight: 134, opacity: Math.min(1, p), transform: `translateX(${(1 - p) * 46}px)`}}>
            <div style={{width: 24, height: 24, marginTop: 8, borderRadius: "50%", flexShrink: 0, background: hot ? accent : "transparent", border: `4px solid ${hot ? accent : hairline}`, transform: `scale(${1 + (hot ? 0.1 : 0.05) * beat})`}} />
            <div style={{width: 200, marginLeft: 32, paddingTop: 6, fontSize: typography.size.caption, fontWeight: typography.weight.bold, letterSpacing: typography.letterSpacing.wideLabel, color: hot ? accent : muted}}>{event.marker}</div>
            <div style={{flex: 1, paddingTop: 2, fontSize: typography.size.body, fontWeight: hot ? typography.weight.black : typography.weight.semibold, lineHeight: 1.24}}>{event.label}</div>
          </div>;
        })}
      </div>
    </div>
    <EditorialSubtitle text={subtitle} color={colors.white72} accent="timeline" />
  </EditorialFrame>;
};
