import fs from "node:fs";
import path from "node:path";

const ROOT = process.env.BINB_APP_ROOT || "/opt/binb";
const L = (lines) => lines.join("\n");

const OLD_MEDIA_LAYER = L([
  'const MediaLayer: React.FC<{media: NonNullable<VisualWorldSpec["media"]>; surface: SceneSurface}> = ({media, surface}) => {',
  '  const src = staticFile(media.src);',
  '  const opacity = media.opacity ?? (surface === "dark" ? 0.34 : 0.26);',
  '  const mediaStyle: React.CSSProperties = {',
  '    width: "100%",',
  '    height: "100%",',
  '    objectFit: "cover",',
  '    filter: surface === "dark" ? "grayscale(1) contrast(1.08) brightness(0.85)" : "grayscale(1) contrast(1.05) brightness(1.08)",',
  '  };',
  '  const frameStyle: React.CSSProperties = {',
  '    opacity,',
  '    mixBlendMode: surface === "dark" ? "screen" : "multiply",',
  '    pointerEvents: "none",',
  '  };',
  '  return <AbsoluteFill style={frameStyle}>',
  '    {media.kind === "video" ? <OffthreadVideo src={src} muted style={mediaStyle} /> : <Img src={src} style={mediaStyle} />}',
  '  </AbsoluteFill>;',
  '};',
]);

const NEW_MEDIA_LAYER = L([
  'const MediaLayer: React.FC<{media: NonNullable<VisualWorldSpec["media"]>; surface: SceneSurface}> = ({media, surface}) => {',
  '  const frame = useCurrentFrame();',
  '  const src = staticFile(media.src);',
  '  const hero = media.treatment === "hero";',
  '  const opacity = media.opacity ?? (hero ? 1 : surface === "dark" ? 0.34 : 0.26);',
  '  const zoom = media.kind === "image" ? 1 + Math.min(frame * 0.00045, 0.09) : 1;',
  '  const mediaStyle: React.CSSProperties = {',
  '    width: "100%",',
  '    height: "100%",',
  '    objectFit: "cover",',
  '    transform: "scale(" + zoom.toFixed(4) + ")",',
  '    filter: hero',
  '      ? "grayscale(1) contrast(1.06) brightness(" + (surface === "dark" ? "0.72" : "1.02") + ")"',
  '      : surface === "dark" ? "grayscale(1) contrast(1.08) brightness(0.85)" : "grayscale(1) contrast(1.05) brightness(1.08)",',
  '  };',
  '  const frameStyle: React.CSSProperties = {',
  '    opacity,',
  '    mixBlendMode: hero ? "normal" : surface === "dark" ? "screen" : "multiply",',
  '    pointerEvents: "none",',
  '  };',
  '  const scrim = surface === "dark"',
  '    ? "linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.55) 62%, rgba(0,0,0,0.72) 100%)"',
  '    : "linear-gradient(180deg, rgba(250,247,240,0.40) 0%, rgba(250,247,240,0.68) 62%, rgba(250,247,240,0.82) 100%)";',
  '  return <AbsoluteFill style={frameStyle}>',
  '    {media.kind === "video" ? <OffthreadVideo src={src} muted style={mediaStyle} /> : <Img src={src} style={mediaStyle} />}',
  '    {hero ? <AbsoluteFill style={ {backgroundImage: scrim} } /> : null}',
  '  </AbsoluteFill>;',
  '};',
]);

const plans = [
  {
    file: "app/remotion/src/episodes/types.ts",
    ops: [
      {
        find: '  media?: {src: string; kind: "image" | "video"; opacity?: number};',
        replace: '  media?: {src: string; kind: "image" | "video"; opacity?: number; treatment?: "backdrop" | "hero"};',
      },
      {
        find: L([
          '    editorialPurpose?: string;',
          '    claimIds?: string[];',
          '    fetch?: Record<string, unknown>;',
        ]),
        replace: L([
          '    editorialPurpose?: string;',
          '    claimIds?: string[];',
          '    treatment?: string;',
          '    fetch?: Record<string, unknown>;',
        ]),
      },
    ],
  },
  {
    file: "app/remotion/src/compositions/GenericEpisode.tsx",
    ops: [
      {
        find: L([
          '    world.media = world.media ?? {',
          '      src: "assets/" + episodeId + "/" + mediaBase,',
          '      kind: (/\\.(mp4|webm|mov)$/i).test(mediaBase) ? "video" : "image",',
          '    };',
        ]),
        replace: L([
          '    world.media = world.media ?? {',
          '      src: "assets/" + episodeId + "/" + mediaBase,',
          '      kind: (/\\.(mp4|webm|mov)$/i).test(mediaBase) ? "video" : "image",',
          '      treatment: assetEntry.treatment === "hero" ? "hero" : "backdrop",',
          '    };',
        ]),
      },
    ],
  },
  {
    file: "app/remotion/src/visual/VisualWorld.tsx",
    requires: ["MediaLayer"],
    ops: [
      {find: OLD_MEDIA_LAYER, replace: NEW_MEDIA_LAYER},
    ],
  },
  {
    file: "app/pipeline/render.mjs",
    ops: [
      {find: 'chunked-v2', replace: 'chunked-v3'},
    ],
  },
];

const failures = [];
const results = [];
for (const plan of plans) {
  const abs = path.join(ROOT, plan.file);
  if (!fs.existsSync(abs)) {
    failures.push(plan.file + ": file tidak ditemukan di " + ROOT);
    continue;
  }
  let text = fs.readFileSync(abs, "utf8");
  for (const marker of plan.requires || []) {
    if (!text.includes(marker)) {
      failures.push(plan.file + ": penanda v1.2b tidak ditemukan - jalankan patches/v12b-media-layer.mjs dulu");
    }
  }
  plan.ops.forEach((op, i) => {
    const expected = op.count ?? 1;
    const found = text.split(op.find).length - 1;
    if (found !== expected) {
      failures.push(plan.file + " op#" + (i + 1) + ": ditemukan " + found + "x, diharapkan " + expected + "x");
      return;
    }
    text = text.split(op.find).join(op.replace);
  });
  results.push({abs, rel: plan.file, text});
}

if (failures.length > 0) {
  console.error("PATCH DIBATALKAN - tidak ada file yang diubah:");
  for (const f of failures) console.error("- " + f);
  process.exit(1);
}

for (const r of results) {
  fs.writeFileSync(r.abs + ".bak-v12c", fs.readFileSync(r.abs));
  fs.writeFileSync(r.abs, r.text);
  console.log("OK " + r.rel);
}
console.log("v1.2c-lite diterapkan (backup: *.bak-v12c).");
