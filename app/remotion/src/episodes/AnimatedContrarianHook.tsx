import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} from "remotion";
import {
  colors,
  typography,
} from "../brand/tokens";
import type {
  EpisodeRenderScene,
} from "./types";

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

export const AnimatedContrarianHook: React.FC<{
  scene: EpisodeRenderScene;
}> = ({scene}) => {
  const frame = useCurrentFrame();

  if (
    scene.type !== "hook" ||
    scene.variant !== "contrarian"
  ) {
    return null;
  }

  const intro = interpolate(
    frame,
    [0, 18],
    [0, 1],
    clamp,
  );
  const camera = interpolate(
    frame,
    [0, 78],
    [0.965, 1],
    clamp,
  );
  const machineIn = interpolate(
    frame,
    [12, 34],
    [0, 1],
    clamp,
  );
  const payoffIn = interpolate(
    frame,
    [52, 72],
    [0, 1],
    clamp,
  );
  const gatePulse =
    frame > 42
      ? 1 + Math.sin((frame - 42) * 0.42) * 0.025
      : 1;

  const packetProgress = [0, 1, 2, 3, 4].map(
    (index) =>
      interpolate(
        frame,
        [10 + index * 5, 48 + index * 5],
        [0, 1],
        clamp,
      ),
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.black,
        color: colors.white,
        fontFamily: typography.family,
        overflow: "hidden",
        padding: "108px 68px 0",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          opacity: intro,
          fontSize: 28,
          lineHeight: 1,
          fontWeight: typography.weight.bold,
          letterSpacing: 4.2,
          color: colors.gray300,
        }}
      >
        {scene.visual.eyebrow}
      </div>

      <div
        style={{
          marginTop: 46,
          opacity: intro,
          transform: `translateY(${(1 - intro) * 28}px)`,
        }}
      >
        <div
          style={{
            fontSize: 112,
            lineHeight: 0.9,
            fontWeight: typography.weight.black,
            letterSpacing: -5,
            color: colors.orange,
          }}
        >
          {scene.visual.statistic}{" "}
          {scene.visual.statisticSuffix}
        </div>
        <div
          style={{
            marginTop: 22,
            width: 880,
            fontSize: 62,
            lineHeight: 0.98,
            fontWeight: typography.weight.black,
            letterSpacing: -2.4,
            color: colors.white,
          }}
        >
          {scene.visual.headline}
        </div>
      </div>

      <div
        style={{
          marginTop: 62,
          width: 944,
          height: 712,
          transform: `scale(${camera})`,
          transformOrigin: "center",
          opacity: intro,
        }}
      >
        <svg
          width="944"
          height="712"
          viewBox="0 0 944 712"
          role="img"
          aria-label="An AI-ready worker moving quickly while work is blocked by a slow company system"
        >
          <defs>
            <linearGradient
              id="machineSurface"
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={colors.charcoal}
              />
              <stop
                offset="100%"
                stopColor={colors.graphite}
              />
            </linearGradient>
            <pattern
              id="grid"
              width="34"
              height="34"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 34 0 L 0 0 0 34"
                fill="none"
                stroke={colors.white}
                strokeOpacity="0.045"
                strokeWidth="2"
              />
            </pattern>
          </defs>

          <rect
            x="1"
            y="1"
            width="942"
            height="710"
            rx="34"
            fill={colors.graphite}
            stroke={colors.charcoal}
            strokeWidth="2"
          />
          <rect
            x="1"
            y="1"
            width="942"
            height="710"
            rx="34"
            fill="url(#grid)"
          />

          <g
            transform={`translate(${(1 - intro) * -44} 0)`}
            opacity={intro}
          >
            <circle
              cx="126"
              cy="294"
              r="48"
              fill={colors.warmWhite}
            />
            <path
              d="M78 374 Q126 340 174 374 L194 530 L58 530 Z"
              fill={colors.orange}
            />
            <rect
              x="88"
              y="408"
              width="76"
              height="84"
              rx="18"
              fill={colors.black}
            />
            <text
              x="126"
              y="462"
              textAnchor="middle"
              fill={colors.white}
              fontFamily={typography.family}
              fontWeight="900"
              fontSize="34"
            >
              AI
            </text>

            <g
              transform="translate(78 202)"
              stroke={colors.orange}
              strokeWidth="7"
              strokeLinecap="round"
            >
              <path d="M48 0 V-28" />
              <path d="M12 15 L-10 -6" />
              <path d="M84 15 L106 -6" />
            </g>

            <text
              x="126"
              y="586"
              textAnchor="middle"
              fill={colors.gray300}
              fontFamily={typography.family}
              fontWeight="700"
              fontSize="22"
              letterSpacing="2"
            >
              AI-READY
            </text>
            <text
              x="126"
              y="616"
              textAnchor="middle"
              fill={colors.white}
              fontFamily={typography.family}
              fontWeight="900"
              fontSize="25"
              letterSpacing="1.5"
            >
              WORKER
            </text>
          </g>

          <path
            d="M218 328 L646 366 L646 450 L218 492 Z"
            fill={colors.orange16}
            stroke={colors.orange}
            strokeWidth="5"
            strokeLinejoin="round"
            strokeDasharray="12 12"
          />

          <path
            d="M218 410 H642"
            stroke={colors.white}
            strokeOpacity="0.22"
            strokeWidth="8"
            strokeLinecap="round"
          />

          <g>
            {packetProgress.map((progress, index) => {
              const x =
                226 + progress * (410 - index * 7);
              const y =
                410 +
                Math.sin(index * 1.8) * 28 *
                  (1 - progress);

              return (
                <g
                  key={index}
                  transform={`translate(${x} ${y})`}
                  opacity={progress}
                >
                  <rect
                    x="-25"
                    y="-25"
                    width="50"
                    height="50"
                    rx="12"
                    fill={colors.orange}
                    stroke={colors.black}
                    strokeWidth="5"
                  />
                  <circle
                    cx="0"
                    cy="0"
                    r="7"
                    fill={colors.white}
                  />
                </g>
              );
            })}
          </g>

          <g
            transform={`translate(0 ${(1 - machineIn) * 34})`}
            opacity={machineIn}
          >
            <g
              transform={`translate(646 0) scale(${gatePulse}) translate(-646 0)`}
            >
              <rect
                x="626"
                y="272"
                width="48"
                height="122"
                rx="10"
                fill={colors.orange}
              />
              <rect
                x="626"
                y="426"
                width="48"
                height="122"
                rx="10"
                fill={colors.orange}
              />
              <path
                d="M650 394 V426"
                stroke={colors.white}
                strokeWidth="8"
                strokeDasharray="7 8"
              />
            </g>

            <circle
              cx="650"
              cy="410"
              r="74"
              fill="none"
              stroke={colors.orange}
              strokeOpacity="0.35"
              strokeWidth="8"
            />

            <rect
              x="704"
              y="112"
              width="202"
              height="498"
              rx="24"
              fill="url(#machineSurface)"
              stroke={colors.white}
              strokeOpacity="0.72"
              strokeWidth="5"
            />
            <rect
              x="728"
              y="142"
              width="154"
              height="72"
              rx="12"
              fill={colors.orange}
            />
            <text
              x="805"
              y="173"
              textAnchor="middle"
              fill={colors.black}
              fontFamily={typography.family}
              fontWeight="900"
              fontSize="19"
              letterSpacing="1.4"
            >
              COMPANY
            </text>
            <text
              x="805"
              y="199"
              textAnchor="middle"
              fill={colors.black}
              fontFamily={typography.family}
              fontWeight="900"
              fontSize="19"
              letterSpacing="1.4"
            >
              SYSTEM
            </text>

            {[
              ["OLD TARGETS", 252],
              ["INCENTIVES", 348],
              ["APPROVALS", 444],
            ].map(([label, y], index) => (
              <g key={label}>
                <rect
                  x="730"
                  y={Number(y)}
                  width="150"
                  height="64"
                  rx="10"
                  fill={
                    index === 1
                      ? colors.charcoal
                      : colors.graphite
                  }
                  stroke={colors.white}
                  strokeOpacity="0.25"
                  strokeWidth="3"
                />
                <circle
                  cx="752"
                  cy={Number(y) + 32}
                  r="8"
                  fill={
                    index === 2
                      ? colors.orange
                      : colors.gray500
                  }
                />
                <text
                  x="770"
                  y={Number(y) + 40}
                  fill={colors.white}
                  fontFamily={typography.family}
                  fontWeight="700"
                  fontSize="17"
                  letterSpacing="0.7"
                >
                  {label}
                </text>
              </g>
            ))}

            <path
              d="M692 410 H704"
              stroke={colors.orange}
              strokeWidth="9"
              strokeLinecap="round"
            />
          </g>

          <g
            opacity={payoffIn}
            transform={`translate(0 ${(1 - payoffIn) * 18})`}
          >
            <rect
              x="238"
              y="626"
              width="468"
              height="6"
              fill={colors.orange}
            />
            <text
              x="472"
              y="676"
              textAnchor="middle"
              fill={colors.white}
              fontFamily={typography.family}
              fontWeight="900"
              fontSize="30"
              letterSpacing="2.4"
            >
              FAST SKILLS · SLOW SYSTEM
            </text>
          </g>
        </svg>
      </div>
    </AbsoluteFill>
  );
};
