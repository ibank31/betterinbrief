import React from "react";
import {spring, useCurrentFrame, useVideoConfig} from "remotion";
import {colors, motion, safeZones, typography} from "../brand/tokens";
import {EditorialFrame, EditorialSubtitle, Eyebrow, SceneBaseProps, microBeat} from "./shared";
import {NarrativeDevice} from "../visual/NarrativeDevice";
import type {ProcessStepItem} from "../episodes/types";

export type ProcessSceneProps = SceneBaseProps & {eyebrow: string; headline: string; steps: ProcessStepItem[]};

// Kamus scene v1.4a - process: langkah berurutan dengan spine dan fokus yang
// berpindah antar langkah secara deterministik (murni fungsi frame, aman
// untuk render chunked). Anti-static-hold tanpa mengorbankan keterbacaan.
export const ProcessScene: React.FC<ProcessSceneProps> = ({eyebrow, headline, steps, subtitle, world, surface}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const surf = surface ?? "dark";
  const bg = surf === "dark" ? colors.graphite : surf === "orange" ? colors.orange : colors.white;
  const fg = surf === "dark" ? colors.white : colors.black;
  const accent = surf === "orange" ? colors.white : colors.orange;
  const muted = surf === "dark" ? colors.gray300 : colors.gray700;
  const hairline = surf === "dark" ? colors.gray700 : "rgba(0,0,0,0.24)";
  const rows = steps.slice(0, 5);
  const focus = rows.length > 0 ? Math.floor(Math.max(0, frame - 46) / 78) % rows.length : 0;
  const beat = microBeat(frame, {start: 46, period: 78});
  const spineIn = spring({frame: frame - 8, fps, config: motion.spring.soft});
  return <EditorialFrame background={bg} color={fg} world={world} surface={surf}>
    <NarrativeDevice kind={world?.device ?? "task_system"} surface={surf} seed={world?.seed} />
    <div style={{position: "absolute", left: safeZones.left, top: safeZones.top, width: 880}}>
      <Eyebrow color={muted}>{eyebrow}</Eyebrow>
      <div style={{marginTop: 48, maxWidth: 820, fontSize: typography.size.headline, lineHeight: typography.lineHeight.headline, fontWeight: typography.weight.black, letterSpacing: typography.letterSpacing.headline}}>{headline}</div>
      <div style={{position: "relative", marginTop: 64}}>
        <div style={{position: "absolute", left: 27, top: 10, bottom: 10, width: 4, background: hairline, transform: `scaleY(${spineIn})`, transformOrigin: "top"}} />
        {rows.map((step, i) => {
          const p = spring({frame: frame - (12 + i * 6), fps, config: motion.spring.editorial});
          const active = i === focus;
          return <div key={step.label} style={{display: "flex", alignItems: "center", minHeight: 126, opacity: Math.min(1, p), transform: `translateX(${(1 - p) * 44}px)`}}>
            <div style={{width: 58, height: 58, borderRadius: "50%", flexShrink: 0, border: `4px solid ${active ? accent : hairline}`, background: active ? (surf === "orange" ? "rgba(255,255,255,0.14)" : colors.orange16) : bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: typography.size.caption, fontWeight: typography.weight.black, color: active ? accent : muted, transform: `scale(${1 + (active ? 0.06 : 0) * beat})`}}>{i + 1}</div>
            <div style={{marginLeft: 34, flex: 1, fontSize: typography.size.body, fontWeight: active ? typography.weight.black : typography.weight.semibold, lineHeight: 1.22}}>{step.label}</div>
          </div>;
        })}
      </div>
    </div>
    <EditorialSubtitle text={subtitle} color={colors.white72} accent="process" />
  </EditorialFrame>;
};
