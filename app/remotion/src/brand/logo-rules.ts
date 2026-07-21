export const logoRules = {
  source: "Use the verified original Better in Brief logo asset only.",

  productionAsset: {
    path: "brand/binb-logo-production.png",
    width: 1007,
    height: 568,
    format: "PNG RGBA",
    sha256:
      "7a2e6188c43842d66613e456e3a686f10e7d1d56b084bd24490f94900132464e",
  },

  allowed: [
    "Verified black-and-orange logo on white background",
    "Verified black-and-orange logo on warm-white background",
    "Subtle watermark on a sufficiently light scene",
    "White or warm-white closing lockup with the tagline Big ideas. Briefly.",
  ],

  forbidden: [
    "Using the production logo directly on a black or dark background",
    "Automatically recoloring black elements to white",
    "Recreating or tracing the logo",
    "Stretching or changing its aspect ratio",
    "Adding glow, bevel, extrusion, outline, or heavy shadow",
    "Displaying it over data, source attribution, or subtitles",
    "Using a standalone intro card before the hook",
  ],

  watermark: {
    allowedSurfaces: ["#FFFFFF", "#F5F2ED"],
    defaultPosition: "top-left",
    widthPx: 112,
    opacity: 0.2,
    xPx: 72,
    yPx: 96,

    hideWhen: [
      "The scene background is dark",
      "The hook headline occupies the same region",
      "The scene contains dense data",
      "The source label needs the same area",
      "Contrast is insufficient",
      "The scene lasts fewer than 45 frames",
    ],
  },

  intro: {
    standaloneIntroAllowed: false,
    rule:
      "The hook starts immediately. A small logo may appear only after the first claim is readable and only on a light surface.",
  },

  closing: {
    durationFrames: 66,
    logoWidthPx: 520,
    tagline: "Big ideas. Briefly.",
    allowedBackgrounds: ["#FFFFFF", "#F5F2ED"],
    darkBackgroundAllowed: false,
  },

  pending: [
    "An official inverse or white logo is required before using the logo directly on dark backgrounds.",
  ],
} as const;
