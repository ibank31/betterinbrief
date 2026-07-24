import React from "react";
import {spring, useCurrentFrame, useVideoConfig} from "remotion";
import {colors, motion, safeZones, typography} from "../brand/tokens";
import {EditorialFrame, EditorialSubtitle, Eyebrow, SceneBaseProps, SourceLine, microBeat} from "./shared";
import {NarrativeDevice} from "../visual/NarrativeDevice";
import type {RankingItem} from "../episodes/types";

export type RankingSceneProps = SceneBaseProps & {eyebrow: string; headline: string; items: RankingItem[]; source?: string};

// Kamus scene v1.4a - ranking: daftar berperingkat dari data nyata.
// Doktrin jujur-data (v1.3b): batang proporsional HANYA digambar bila SEMUA
// item membawa angka asli; tanpa angka, ranking tampil sebagai daftar
// bernomor tanpa chart yang menyiratkan data palsu.
export const RankingScene: React.FC<RankingSceneProps> = ({eyebrow, headline, items, source, subtitle, world, surface}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const surf = surface ?? "dark";
  const bg = surf === "dark" ? colors.graphite : surf === "orange" ? colors.orange : colors.white;
  const fg = surf === "dark" ? colors.white : colors.black;
  const accent = surf === "orange" ? colors.white : colors.orange;
  const muted = surf === "dark" ? colors.gray300 : colors.gray700;
  const hairline = surf === "dark" ? colors.gray700 : "rgba(0,0,0,0.24)";
  const rows = items.slice(0, 5);
  const values = rows.map((item) => (typeof item.value === "number" && Number.isFinite(item.value) && item.value > 0 ? item.value : null));
  const hasData = rows.length > 0 && values.every((value) => value !== null);
  const scale = hasData ? Math.max(...values.map((value) => value ?? 0)) : 0;
  return <EditorialFrame background={bg} color={fg} world={world} surface={surf}>
    <NarrativeDevice kind={world?.device ?? "priority_signal"} surface={surf} seed={world?.seed} data={hasData ? {values: values.map((value) => value ?? 0), max: scale} : undefined} />
    <div style={{position: "absolute", left: safeZones.left, top: safeZones.top, width: 880}}>
      <Eyebrow color={muted}>{eyebrow}</Eyebrow>
      <div style={{marginTop: 48, maxWidth: 820, fontSize: typography.size.headline, lineHeight: typography.lineHeight.headline, fontWeight: typography.weight.black, letterSpacing: typography.letterSpacing.headline}}>{headline}</div>
      <div style={{marginTop: 60}}>
        {rows.map((item, i) => {
          const p = spring({frame: frame - (10 + i * 5), fps, config: motion.spring.editorial});
          const beat = microBeat(frame, {start: 62, period: 82, phase: i * 9});
          const hero = i === 0;
          const barWidth = hasData ? Math.max(90, ((values[i] ?? 0) / Math.max(1, scale)) * 560) : 0;
          return <div key={item.label} style={{minHeight: 124, borderTop: `1px solid ${hairline}`, display: "flex", alignItems: "center", opacity: Math.min(1, p), transform: `translateX(${(1 - p) * 40}px)`}}>
            <span style={{width: 88, fontSize: typography.size.body, color: hero ? accent : colors.gray500, fontWeight: typography.weight.black}}>{`0${i + 1}`}</span>
            <span style={{flex: 1, paddingRight: 24, fontSize: typography.size.body, fontWeight: hero ? typography.weight.black : typography.weight.semibold, lineHeight: 1.2}}>
              <span>{item.label}</span>
              {hasData ? <span style={{display: "block", marginTop: 14, width: barWidth, height: 12, background: hero ? accent : hairline, transform: `scaleX(${p * (1 + (hero ? 0.03 : 0) * beat)})`, transformOrigin: "left center"}} /> : null}
            </span>
            {item.valueLabel ? <span style={{fontSize: typography.size.caption, fontWeight: typography.weight.bold, letterSpacing: typography.letterSpacing.wideLabel, color: hero ? accent : muted}}>{item.valueLabel}</span> : null}
          </div>;
        })}
      </div>
    </div>
    {source ? <SourceLine color={muted}>{source}</SourceLine> : null}
    <EditorialSubtitle text={subtitle} color={colors.white72} accent="ranking" />
  </EditorialFrame>;
};
