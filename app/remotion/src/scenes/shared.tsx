import React from "react";
import {AbsoluteFill, interpolate, useCurrentFrame} from "remotion";
import {colors, safeZones, subtitle, texture, typography} from "../brand/tokens";

export type SceneBaseProps = {
  subtitle?: string;
};

export const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

export const EditorialFrame: React.FC<React.PropsWithChildren<{
  background?: string;
  color?: string;
  textureOn?: boolean;
}>> = ({background = colors.white, color = colors.black, textureOn = true, children}) => (
  <AbsoluteFill style={{backgroundColor: background, color, fontFamily: typography.family, overflow: "hidden"}}>
    {textureOn ? <AbsoluteFill style={{opacity: texture.noiseOpacityMinimum, backgroundImage: "repeating-linear-gradient(0deg, transparent 0px, transparent 3px, currentColor 4px)", pointerEvents: "none"}} /> : null}
    {children}
  </AbsoluteFill>
);

// Subtitle bawah DIMATIKAN: narasi kini hanya tampil lewat kinetic captions
// (CaptionOverlay). Dua lapis teks di area yang sama membuat tampilan
// bertumpuk. Komponen dipertahankan agar semua scene lama tetap kompatibel.
export const EditorialSubtitle: React.FC<{text?: string; color?: string; accent?: string}> = () => null;

export const SourceLine: React.FC<{children: React.ReactNode; color?: string}> = ({children, color = colors.gray500}) => (
  <div style={{position: "absolute", left: safeZones.left, top: 1308, maxWidth: safeZones.sourceMaxWidth, fontSize: typography.size.source, lineHeight: typography.lineHeight.source, fontWeight: typography.weight.semibold, letterSpacing: typography.letterSpacing.label, color}}>{children}</div>
);

export const Eyebrow: React.FC<{children: React.ReactNode; color?: string}> = ({children, color = colors.gray700}) => (
  <div style={{fontSize: typography.size.caption, fontWeight: typography.weight.bold, letterSpacing: typography.letterSpacing.wideLabel, color, textTransform: "uppercase"}}>{children}</div>
);
