import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} from "remotion";
import {AnimatedContrarianHook} from "./AnimatedContrarianHook";
import type {
  EpisodeRenderScene,
  EpisodeSceneType,
  SceneMotion,
  SceneSurface,
} from "./types";

const regressionDefaults: Record<
  EpisodeSceneType,
  string
> = {
  hook: "statistic",
  correction: "equation",
  data_proof: "single_value",
  task_breakdown: "cards",
  comparison: "split",
  outcome: "statement",
  closing_brand: "standard",
};

const accents: Record<SceneSurface, string> = {
  dark: "#F36A2D",
  light: "#111111",
  orange: "#FFF7F0",
};

const foregrounds: Record<SceneSurface, string> = {
  dark: "#FFFFFF",
  light: "#111111",
  orange: "#111111",
};

const motionTransform = (
  motion: SceneMotion,
  progress: number,
): string => {
  const x = interpolate(
    progress,
    [0, 1],
    [-36, 0],
  );
  const y = interpolate(
    progress,
    [0, 1],
    [24, 0],
  );
  const scaleUp = interpolate(
    progress,
    [0, 1],
    [0.965, 1],
  );
  const scaleDown = interpolate(
    progress,
    [0, 1],
    [1.035, 1],
  );

  switch (motion) {
    case "sharp_correction":
    case "left_to_right":
      return `translateX(${x}px)`;

    case "stacked_build":
      return `scale(${scaleUp})`;

    case "subtraction":
      return `scale(${scaleDown})`;

    case "restrained_lift":
      return `translateY(${y}px)`;

    case "measured_reveal":
      return "none";

    default: {
      const exhaustive: never = motion;
      return exhaustive;
    }
  }
};

const EdgeMarks: React.FC<{
  accent: string;
}> = ({accent}) => (
  <>
    <div
      style={{
        position: "absolute",
        left: 42,
        top: 42,
        width: 120,
        height: 8,
        borderRadius: 999,
        backgroundColor: accent,
        opacity: 0.7,
      }}
    />
    <div
      style={{
        position: "absolute",
        right: 42,
        bottom: 172,
        width: 8,
        height: 120,
        borderRadius: 999,
        backgroundColor: accent,
        opacity: 0.5,
      }}
    />
  </>
);

const HorizontalRail: React.FC<{
  accent: string;
  nodes?: boolean;
}> = ({accent, nodes = false}) => (
  <div
    style={{
      position: "absolute",
      left: 56,
      right: 56,
      bottom: 214,
      height: 7,
      borderRadius: 999,
      backgroundColor: accent,
      opacity: 0.25,
    }}
  >
    {nodes
      ? [0, 1, 2, 3].map((index) => (
          <div
            key={index}
            style={{
              position: "absolute",
              left: `${index * 33.333}%`,
              top: -12,
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: `5px solid ${accent}`,
            }}
          />
        ))
      : null}
  </div>
);

const CardStack: React.FC<{
  accent: string;
}> = ({accent}) => (
  <>
    {[0, 1, 2].map((index) => (
      <div
        key={index}
        style={{
          position: "absolute",
          right: 48 + index * 18,
          top: 154 + index * 18,
          width: 190,
          height: 118,
          borderRadius: 22,
          border: `5px solid ${accent}`,
          opacity: 0.08 + index * 0.05,
        }}
      />
    ))}
  </>
);

const FlowMarks: React.FC<{
  accent: string;
}> = ({accent}) => (
  <div
    style={{
      position: "absolute",
      left: 58,
      top: 190,
      display: "flex",
      alignItems: "center",
      gap: 14,
      opacity: 0.2,
    }}
  >
    {[0, 1, 2].map((index) => (
      <React.Fragment key={index}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            border: `5px solid ${accent}`,
          }}
        />
        {index < 2 ? (
          <div
            style={{
              color: accent,
              fontSize: 38,
              fontWeight: 900,
            }}
          >
            →
          </div>
        ) : null}
      </React.Fragment>
    ))}
  </div>
);

const GridMarks: React.FC<{
  accent: string;
}> = ({accent}) => (
  <div
    style={{
      position: "absolute",
      left: 54,
      right: 54,
      bottom: 202,
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 14,
      opacity: 0.15,
    }}
  >
    {[1, 2, 3].map((item) => (
      <div
        key={item}
        style={{
          height: 76,
          borderRadius: 18,
          border: `5px solid ${accent}`,
        }}
      />
    ))}
  </div>
);

const VariantGeometry: React.FC<{
  variant: string;
  accent: string;
}> = ({variant, accent}) => {
  switch (variant) {
    case "question":
      return (
        <div
          style={{
            position: "absolute",
            right: 20,
            top: 164,
            color: accent,
            fontSize: 380,
            fontWeight: 900,
            lineHeight: 1,
            opacity: 0.1,
          }}
        >
          ?
        </div>
      );

    case "timeline":
      return (
        <HorizontalRail
          accent={accent}
          nodes
        />
      );

    case "proportion":
      return (
        <div
          style={{
            position: "absolute",
            left: 56,
            right: 56,
            bottom: 210,
            height: 28,
            borderRadius: 999,
            border: `5px solid ${accent}`,
            opacity: 0.2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: "62%",
              height: "100%",
              backgroundColor: accent,
            }}
          />
        </div>
      );

    case "stack":
      return <CardStack accent={accent} />;

    case "flow":
      return <FlowMarks accent={accent} />;

    case "ladder":
      return (
        <div
          style={{
            position: "absolute",
            right: 50,
            top: 176,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 12,
            opacity: 0.2,
          }}
        >
          {[86, 132, 178, 224].map(
            (width) => (
              <div
                key={width}
                style={{
                  width,
                  height: 13,
                  borderRadius: 999,
                  backgroundColor: accent,
                }}
              />
            ),
          )}
        </div>
      );

    case "two_speed":
      return (
        <>
          <div
            style={{
              position: "absolute",
              left: 50,
              top: 176,
              width: 230,
              height: 12,
              borderRadius: 999,
              backgroundColor: accent,
              opacity: 0.18,
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 50,
              top: 216,
              width: 420,
              height: 12,
              borderRadius: 999,
              backgroundColor: accent,
              opacity: 0.3,
            }}
          />
        </>
      );

    case "framework":
      return <GridMarks accent={accent} />;

    case "strike_replace":
      return (
        <div
          style={{
            position: "absolute",
            left: 116,
            right: 116,
            top: "46%",
            height: 12,
            borderRadius: 999,
            backgroundColor: accent,
            opacity: 0.28,
            transform: "rotate(-7deg)",
          }}
        />
      );

    case "reframe":
      return (
        <div
          style={{
            position: "absolute",
            inset: "92px 48px 166px",
            borderRadius: 34,
            border: `7px solid ${accent}`,
            opacity: 0.13,
          }}
        />
      );

    case "contrarian":
    case "comparison":
    default:
      return <EdgeMarks accent={accent} />;
  }
};

const SemanticComparisonProof: React.FC<{
  scene: EpisodeRenderScene;
}> = ({scene}) => {
  const frame = useCurrentFrame();

  if (
    scene.type !== "data_proof" ||
    scene.variant !== "comparison"
  ) {
    return null;
  }

  const organizationValue = scene.visual.value;
  const individualMatch = scene.narration.match(
    /Individual factors accounted for\s+(\d+(?:\.\d+)?)\s+percent/i,
  );
  const individualValue = individualMatch
    ? Number(individualMatch[1])
    : Math.max(0, 100 - organizationValue);

  const organizationProgress = interpolate(
    frame,
    [8, 52],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const individualProgress = interpolate(
    frame,
    [34, 78],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const rows = [
    {
      key: "organization",
      label: "ORGANIZATIONAL FACTORS",
      value: organizationValue,
      shown: Math.round(
        organizationValue * organizationProgress,
      ),
      progress: organizationProgress,
      color: "#F36A2D",
      numberColor: "#111111",
    },
    {
      key: "individual",
      label: "INDIVIDUAL FACTORS",
      value: individualValue,
      shown: Math.round(
        individualValue * individualProgress,
      ),
      progress: individualProgress,
      color: "#F7F3EE",
      numberColor: "#111111",
    },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#111111",
        color: "#FFFFFF",
        padding: "112px 68px 0",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          fontSize: 25,
          lineHeight: 1,
          fontWeight: 800,
          letterSpacing: 4.4,
          color: "#A9A6A1",
        }}
      >
        {scene.visual.eyebrow}
      </div>

      <div
        style={{
          marginTop: 64,
          width: 900,
          fontSize: 72,
          lineHeight: 0.96,
          fontWeight: 900,
          letterSpacing: -3.6,
        }}
      >
        AI IMPACT IS MOSTLY
        <br />
        <span style={{color: "#F36A2D"}}>
          ORGANIZATIONAL
        </span>
      </div>

      <div
        style={{
          marginTop: 74,
          display: "flex",
          flexDirection: "column",
          gap: 48,
        }}
      >
        {rows.map((row) => (
          <div key={row.key}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  fontSize: 27,
                  lineHeight: 1,
                  fontWeight: 800,
                  letterSpacing: 2.2,
                  color: "#D6D3CE",
                }}
              >
                {row.label}
              </div>
              <div
                style={{
                  fontSize: 24,
                  lineHeight: 1,
                  fontWeight: 700,
                  color: "#8F8C87",
                }}
              >
                LINKED TO REPORTED IMPACT
              </div>
            </div>

            <div
              style={{
                position: "relative",
                width: 944,
                height: 238,
                overflow: "hidden",
                backgroundColor: "#242424",
                border: "2px solid #353535",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  width: `${row.value * row.progress}%`,
                  minWidth: row.progress > 0 ? 12 : 0,
                  backgroundColor: row.color,
                }}
              />

              <div
                style={{
                  position: "absolute",
                  left: 32,
                  top: 24,
                  display: "flex",
                  alignItems: "flex-start",
                  color: row.numberColor,
                }}
              >
                <span
                  style={{
                    fontSize: 154,
                    lineHeight: 0.9,
                    fontWeight: 900,
                    letterSpacing: -9,
                  }}
                >
                  {row.shown}
                </span>
                <span
                  style={{
                    marginTop: 9,
                    marginLeft: 10,
                    fontSize: 54,
                    lineHeight: 1,
                    fontWeight: 900,
                  }}
                >
                  %
                </span>
              </div>

              {row.key === "organization" ? (
                <div
                  style={{
                    position: "absolute",
                    right: 28,
                    top: 78,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    opacity: organizationProgress,
                  }}
                >
                  {[0, 1, 2].map((index) => (
                    <React.Fragment key={index}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 8,
                          border: "5px solid #111111",
                          boxSizing: "border-box",
                        }}
                      />
                      {index < 2 ? (
                        <div
                          style={{
                            width: 28,
                            height: 5,
                            backgroundColor: "#111111",
                          }}
                        />
                      ) : null}
                    </React.Fragment>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 44,
          width: 944,
          display: "flex",
          alignItems: "center",
          gap: 18,
          color: "#A9A6A1",
          fontSize: 23,
          lineHeight: 1,
          fontWeight: 750,
          letterSpacing: 2.2,
        }}
      >
        <div
          style={{
            width: 74,
            height: 6,
            backgroundColor: "#F36A2D",
          }}
        />
        THE SYSTEM EXPLAINS MORE THAN SKILL ALONE
      </div>
    </AbsoluteFill>
  );
};

const CaptionSafeVariantLabels: React.FC<{
  scene: EpisodeRenderScene;
}> = ({scene}) => {
  if (
    scene.type === "data_proof" &&
    scene.variant === "comparison"
  ) {
    return (
      <div
        style={{
          position: "absolute",
          left: 56,
          top: 1260,
          width: 968,
          color: foregrounds[scene.surface],
          fontSize: 22,
          lineHeight: 1.2,
          fontWeight: 700,
          letterSpacing: 2.2,
          textTransform: "uppercase",
          opacity: 0.72,
        }}
      >
        {scene.visual.source}
      </div>
    );
  }

  if (
    scene.type === "outcome" &&
    scene.variant === "framework"
  ) {
    return (
      <div
        style={{
          position: "absolute",
          left: 116,
          top: 1060,
          width: 780,
          boxSizing: "border-box",
          borderTop: "8px solid #111111",
          padding: "28px 28px 26px",
          backgroundColor: "#F36A2D",
          zIndex: 1,
          color: foregrounds[scene.surface],
          fontSize: 58,
          lineHeight: 0.94,
          fontWeight: 900,
          letterSpacing: -2,
        }}
      >
        {scene.visual.question}
      </div>
    );
  }

  return null;
};

export const isRegressionDefaultVariant = (
  scene: EpisodeRenderScene,
): boolean =>
  regressionDefaults[scene.type] ===
  scene.variant;

export const VariantSceneFrame: React.FC<
  React.PropsWithChildren<{
    scene: EpisodeRenderScene;
  }>
> = ({scene, children}) => {
  const frame = useCurrentFrame();

  if (isRegressionDefaultVariant(scene)) {
    return <>{children}</>;
  }

  const progress = interpolate(
    frame,
    [0, 14],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          opacity: interpolate(
            progress,
            [0, 1],
            [0.82, 1],
          ),
          transform: motionTransform(
            scene.motion,
            progress,
          ),
          transformOrigin: "center",
        }}
      >
        {children}
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          pointerEvents: "none",
          overflow: "hidden",
          zIndex: 20,
        }}
      >
        <VariantGeometry
          variant={scene.variant}
          accent={accents[scene.surface]}
        />
        <AnimatedContrarianHook scene={scene} />
        <SemanticComparisonProof scene={scene} />
        <CaptionSafeVariantLabels scene={scene} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
