import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  colors,
  motion,
  safeZones,
  typography,
} from "../brand/tokens";
import {logoAssets} from "../brand/logo-assets";

export const RuntimeTest: React.FC = () => {
  const frame = useCurrentFrame();

  const enter = interpolate(
    frame,
    [0, motion.standard],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const logoEnter = interpolate(
    frame,
    [motion.standard, motion.standard + motion.emphasis],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.white,
        color: colors.black,
        fontFamily: typography.family,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: safeZones.left,
          right: safeZones.right,
          top: safeZones.top,
          opacity: enter,
          transform: `translateY(${(1 - enter) * 40}px)`,
        }}
      >
        <div
          style={{
            width: 104,
            height: 12,
            backgroundColor: colors.orange,
            marginBottom: 48,
          }}
        />

        <div
          style={{
            fontSize: typography.size.caption,
            fontWeight: typography.weight.bold,
            letterSpacing: typography.letterSpacing.wideLabel,
            color: colors.gray700,
            marginBottom: 32,
          }}
        >
          RUNTIME CHECK · 9:16
        </div>

        <div
          style={{
            maxWidth: 820,
            fontSize: typography.size.hero,
            lineHeight: typography.lineHeight.hero,
            letterSpacing: typography.letterSpacing.tight,
            fontWeight: typography.weight.black,
          }}
        >
          Editorial video,
          <br />
          built locally.
        </div>

        <div
          style={{
            maxWidth: 760,
            marginTop: 48,
            fontSize: typography.size.body,
            lineHeight: typography.lineHeight.body,
            color: colors.gray700,
            fontWeight: typography.weight.medium,
          }}
        >
          Remotion, Chromium, TypeScript, and the verified Better in Brief
          identity are connected.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: safeZones.left,
          bottom: 470,
          opacity: logoEnter,
          transform: `translateY(${(1 - logoEnter) * 28}px)`,
        }}
      >
        <Img
          src={staticFile(logoAssets.production)}
          style={{
            width: 520,
            height: "auto",
            display: "block",
          }}
        />

        <div
          style={{
            marginTop: 24,
            fontSize: typography.size.title,
            lineHeight: typography.lineHeight.title,
            fontWeight: typography.weight.bold,
            letterSpacing: typography.letterSpacing.headline,
          }}
        >
          Big ideas. Briefly.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: safeZones.left,
          bottom: safeZones.bottom,
          fontSize: typography.size.source,
          letterSpacing: typography.letterSpacing.label,
          color: colors.gray500,
          fontWeight: typography.weight.semibold,
        }}
      >
        REMOTION 4.0.489 · TERMUX + DEBIAN
      </div>
    </AbsoluteFill>
  );
};
