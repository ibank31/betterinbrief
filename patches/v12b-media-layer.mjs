import fs from "node:fs";
import path from "node:path";

const ROOT = process.env.BINB_APP_ROOT || "/opt/binb";
const L = (lines) => lines.join("\n");

const MEDIA_LAYER = L([
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
  '',
  'export const EditorialWorld: React.FC<{world: VisualWorldSpec; surface: SceneSurface}> = ({world, surface}) => {',
]);

const WORLD_WITH_MEDIA = L([
  '  const assetEntry = (scene.visualAssets ?? []).find((a) => typeof a.file === "string" && a.file.startsWith("assets/"));',
  '  const mediaBase = assetEntry && assetEntry.file ? assetEntry.file.slice(7) : null;',
  '  const world: VisualWorldSpec = {',
  '    ...defaultVisualWorld(scene.id, scene.surface, scene.type, episodeId),',
  '    ...scene.visualSystem,',
  '    seed: scene.visualSystem?.seed ?? episodeId + "-" + scene.id,',
  '  };',
  '  if (mediaBase) {',
  '    world.media = world.media ?? {',
  '      src: "assets/" + episodeId + "/" + mediaBase,',
  '      kind: (/\\.(mp4|webm|mov)$/i).test(mediaBase) ? "video" : "image",',
  '    };',
  '  }',
]);

const plans = [
  {
    file: "app/remotion/src/episodes/types.ts",
    ops: [
      {
        find: L([
          '  material: "paper" | "scan" | "grid" | "grain" | "halftone";',
          '  /** Optional scene-level metaphor. Components provide a safe type default. */',
          '  device?: NarrativeDeviceKind;',
          '};',
        ]),
        replace: L([
          '  material: "paper" | "scan" | "grid" | "grain" | "halftone";',
          '  /** Optional scene-level metaphor. Components provide a safe type default. */',
          '  device?: NarrativeDeviceKind;',
          '  /** Optional media backdrop staged by tools/assets-fetch.mjs. */',
          '  media?: {src: string; kind: "image" | "video"; opacity?: number};',
          '};',
        ]),
      },
      {
        find: L([
          '  /** Optional authoring override. Absent values are resolved by the system. */',
          '  visualSystem?: Partial<VisualWorldSpec>;',
        ]),
        replace: L([
          '  /** Optional authoring override. Absent values are resolved by the system. */',
          '  visualSystem?: Partial<VisualWorldSpec>;',
          '  /** Optional evidence/context asset layer (divalidasi validate.mjs). */',
          '  visualAssets?: Array<{',
          '    assetId: string;',
          '    role: string;',
          '    kind: string;',
          '    rightsStatus: string;',
          '    file?: string;',
          '    sourceId?: string;',
          '    licenseUrl?: string;',
          '    attribution?: string;',
          '    editorialPurpose?: string;',
          '    claimIds?: string[];',
          '    fetch?: Record<string, unknown>;',
          '  }>;',
        ]),
      },
    ],
  },
  {
    file: "app/remotion/src/visual/VisualWorld.tsx",
    requires: ["variationKey"],
    ops: [
      {
        find: 'import {AbsoluteFill, interpolate, random, useCurrentFrame} from "remotion";',
        replace: 'import {AbsoluteFill, Img, OffthreadVideo, interpolate, random, staticFile, useCurrentFrame} from "remotion";',
      },
      {
        find: 'export const EditorialWorld: React.FC<{world: VisualWorldSpec; surface: SceneSurface}> = ({world, surface}) => {',
        replace: MEDIA_LAYER,
      },
      {
        find: '    <MaterialLayer material={resolved.material} ink={palette.ink} faint={palette.faint} />',
        replace: L([
          '    {resolved.media ? <MediaLayer media={resolved.media} surface={surface} /> : null}',
          '    <MaterialLayer material={resolved.material} ink={palette.ink} faint={palette.faint} />',
        ]),
      },
    ],
  },
  {
    file: "app/remotion/src/compositions/GenericEpisode.tsx",
    requires: ['episodeId + "-" + scene.id'],
    ops: [
      {
        find: L([
          'import type {',
          '  EpisodeRenderProps,',
          '  EpisodeRenderScene,',
          '} from "../episodes/types";',
        ]),
        replace: L([
          'import type {',
          '  EpisodeRenderProps,',
          '  EpisodeRenderScene,',
          '  VisualWorldSpec,',
          '} from "../episodes/types";',
        ]),
      },
      {
        find: L([
          '  const world = {',
          '    ...defaultVisualWorld(scene.id, scene.surface, scene.type, episodeId),',
          '    ...scene.visualSystem,',
          '    seed: scene.visualSystem?.seed ?? episodeId + "-" + scene.id,',
          '  };',
        ]),
        replace: WORLD_WITH_MEDIA,
      },
    ],
  },
  {
    file: "app/pipeline/validate.mjs",
    ops: [
      {
        find: 'const ASSET_KINDS = ["original_data_visual", "original_diagram", "source_excerpt", "ui_capture", "map", "public_domain", "cc_licensed", "original_photo"];',
        replace: 'const ASSET_KINDS = ["original_data_visual", "original_diagram", "source_excerpt", "ui_capture", "map", "public_domain", "cc_licensed", "original_photo", "stock_media", "ai_generated"];',
      },
      {
        find: 'const external = ["source_excerpt", "ui_capture", "map", "public_domain", "cc_licensed", "original_photo"].includes(asset.kind);',
        replace: 'const external = ["source_excerpt", "ui_capture", "map", "public_domain", "cc_licensed", "original_photo", "stock_media", "ai_generated"].includes(asset.kind);',
      },
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
      failures.push(plan.file + ": penanda v1.2a tidak ditemukan - jalankan patches/v12a-visual-variety.mjs dulu");
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
  fs.writeFileSync(r.abs + ".bak-v12b", fs.readFileSync(r.abs));
  fs.writeFileSync(r.abs, r.text);
  console.log("OK " + r.rel);
}
console.log("v1.2b diterapkan (backup: *.bak-v12b). Lanjut: node app/cli/binb.mjs test");
