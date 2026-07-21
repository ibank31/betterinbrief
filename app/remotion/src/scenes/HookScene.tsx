import React from "react";
import {interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {colors, motion, safeZones, typography} from "../brand/tokens";
import {EditorialFrame, EditorialSubtitle, Eyebrow, SceneBaseProps, clamp} from "./shared";

export type HookSceneProps = SceneBaseProps & {
  eyebrow: string;
  statistic: string;
  statisticSuffix: string;
  headline: string;
  highlightedIndex?: number;
};

export const HookScene: React.FC<HookSceneProps> = ({eyebrow, statistic, statisticSuffix, headline, subtitle, highlightedIndex = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const hit = spring({frame, fps, config: motion.spring.tight});
  const headlineIn = interpolate(frame, [8, 20], [0, 1], clamp);
  // Count-up statistik: angka bergerak naik di ~0.9 detik pertama agar frame
  // pembuka tidak statis (retention) tanpa mengubah nilai akhirnya.
  const statMatch = statistic.match(/^(\d+)(.*)$/);
  const countProgress = interpolate(frame, [0, 26], [0, 1], clamp);
  const countEased = 1 - Math.pow(1 - countProgress, 3);
  const displayStatistic = statMatch
    ? `${Math.round(parseInt(statMatch[1], 10) * countEased)}${statMatch[2]}`
    : statistic;
  return <EditorialFrame background={colors.black} color={colors.white}>
    <div style={{position: "absolute", left: safeZones.left, top: safeZones.top, width: 820}}>
      <Eyebrow color={colors.gray300}>{eyebrow}</Eyebrow>
      <div style={{display: "flex", alignItems: "baseline", marginTop: 64, transform: `translateY(${(1-hit)*42}px)`, opacity: hit}}>
        <span style={{fontSize: 260, lineHeight: .82, fontWeight: typography.weight.black, letterSpacing: -12, color: colors.orange}}>{displayStatistic}</span>
        <span style={{marginLeft: 26, fontSize: typography.size.display, lineHeight: 1, fontWeight: typography.weight.bold, letterSpacing: -3}}>{statisticSuffix}</span>
      </div>
      <div style={{marginTop: 74, maxWidth: 790, fontSize: typography.size.headline, lineHeight: typography.lineHeight.headline, fontWeight: typography.weight.black, letterSpacing: typography.letterSpacing.headline, opacity: headlineIn, transform: `translateX(${(1-headlineIn)*-36}px)`}}>{headline}</div>
    </div>
    <div style={{position: "absolute", left: 600, top: 760, display: "flex", gap: 24}}>
      {[0,1,2,3].map((i) => {
        const on = i === highlightedIndex;
        const workerColor = on ? colors.orange : colors.gray700;
        const workerIn = interpolate(frame, [12 + i * 3, 22 + i * 3], [0, 1], clamp);

        return (
          <div
            key={i}
            style={{
              width: 64,
              opacity: workerIn,
              transform: `translateY(${(1 - workerIn) * 28 + (i % 2 ? 12 : 0)}px)`,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                margin: "0 auto 10px",
                borderRadius: "50%",
                backgroundColor: workerColor,
              }}
            />
            <div
              style={{
                width: 64,
                height: 74,
                backgroundColor: workerColor,
                clipPath: "polygon(18% 0, 82% 0, 100% 100%, 0 100%)",
              }}
            />
          </div>
        );
      })}
    </div>
    <EditorialSubtitle text={subtitle} color={colors.white72}/>
  </EditorialFrame>;
};
