/**
 * Better in Brief — Design Tokens v1
 *
 * Brand core:
 * - Black
 * - BinB Orange
 * - White
 *
 * Navy and electric blue are not primary brand colors.
 */

export const canvas = {
  width: 1080,
  height: 1920,
  fps: 30,
  aspectRatio: "9:16",
} as const;

export const colors = {
  // Official brand core.
  black: "#000000",
  orange: "#FE5001",
  white: "#FFFFFF",

  // Supporting neutrals only.
  graphite: "#171717",
  charcoal: "#242424",
  gray700: "#555555",
  gray500: "#858585",
  gray300: "#BDBDBD",
  gray100: "#E8E8E8",
  warmWhite: "#F5F2ED",

  // Transparent utility colors.
  white92: "rgba(255,255,255,0.92)",
  white72: "rgba(255,255,255,0.72)",
  white48: "rgba(255,255,255,0.48)",
  white20: "rgba(255,255,255,0.20)",
  black72: "rgba(0,0,0,0.72)",
  black20: "rgba(0,0,0,0.20)",
  orange16: "rgba(254,80,1,0.16)",
} as const;

export const typography = {
  family: '"Inter", "Liberation Sans", "DejaVu Sans", Arial, sans-serif',

  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 900,
  },

  size: {
    hero: 132,
    display: 104,
    headline: 80,
    title: 64,
    body: 44,
    subtitle: 46,
    caption: 32,
    source: 26,
  },

  lineHeight: {
    hero: 0.94,
    display: 0.98,
    headline: 1.02,
    title: 1.08,
    body: 1.2,
    subtitle: 1.16,
    caption: 1.25,
    source: 1.25,
  },

  letterSpacing: {
    tight: -3.2,
    display: -2,
    headline: -1.2,
    normal: 0,
    label: 1.8,
    wideLabel: 3.2,
  },
} as const;

export const spacing = {
  xxs: 8,
  xs: 12,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
  xxl: 64,
  huge: 96,
  giant: 128,
} as const;

export const grid = {
  columns: 12,
  leftMargin: 72,
  rightMargin: 128,
  gutter: 20,
  contentWidth: 880,
} as const;

export const safeZones = {
  top: 160,
  left: 72,
  right: 128,
  bottom: 420,

  contentTop: 160,
  contentBottom: 1500,

  titleMaxWidth: 860,
  subtitleMaxWidth: 880,
  sourceMaxWidth: 760,
} as const;

export const motion = {
  // Frame counts at 30 fps.
  snap: 8,
  fast: 12,
  standard: 18,
  emphasis: 26,
  settle: 36,
  minimumHold: 45,
  maximumTransition: 12,

  spring: {
    tight: {
      damping: 22,
      stiffness: 210,
      mass: 0.8,
    },
    editorial: {
      damping: 26,
      stiffness: 150,
      mass: 0.9,
    },
    soft: {
      damping: 30,
      stiffness: 110,
      mass: 1,
    },
  },

  easing: {
    enter: [0.22, 1, 0.36, 1],
    exit: [0.4, 0, 1, 1],
    data: [0.16, 1, 0.3, 1],
  },
} as const;

export const subtitle = {
  fontSize: 46,
  fontWeight: 600,
  lineHeight: 1.16,
  maxLines: 2,
  maxWidth: 880,

  // Approximate editorial limits, not automatic truncation rules.
  preferredWordsPerChunk: 8,
  maximumWordsPerChunk: 12,

  bottomOffset: 430,
  horizontalPadding: 0,

  emphasisMaximumWords: 3,
  permanentBoxAllowed: false,
} as const;

export const logo = {
  watermark: {
    width: 112,
    opacity: 0.2,
    x: 72,
    y: 96,
    revealAfterFrames: 24,
  },

  hookLockup: {
    width: 96,
    earliestFrame: 12,
  },

  closing: {
    width: 520,
    durationFrames: 66,
    taglineGap: 24,
  },
} as const;

export const texture = {
  noiseOpacityMinimum: 0.05,
  noiseOpacityMaximum: 0.025,
  vignetteAllowed: false,
  glowAllowed: false,
  heavyShadowAllowed: false,
} as const;
