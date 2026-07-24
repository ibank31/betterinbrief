import fs from "node:fs";
import path from "node:path";

const ROOT = process.env.BINB_APP_ROOT || "/opt/binb";
const L = (lines) => lines.join("\n");

const OLD_DEFAULT_WORLD = L([
  'export const defaultVisualWorld = (',
  '  sceneId: string,',
  '  surface: SceneSurface,',
  '  type: string,',
  '): VisualWorldSpec => {',
  '  const laneByType: Record<string, VisualLane> = {',
  '    hook: "object_metaphor",',
  '    correction: "editorial_collage",',
  '    data_proof: "evidence_desk",',
  '    task_breakdown: "diagram_world",',
  '    comparison: "diagram_world",',
  '    outcome: "editorial_type",',
  '    closing_brand: "editorial_type",',
  '  };',
  '  const lane = laneByType[type] ?? "editorial_collage";',
  '  return {',
  '    lane,',
  '    density: laneDefaults[lane].density,',
  '    seed: sceneId,',
  '    material: laneDefaults[lane].material,',
  '  };',
  '};',
]);

const NEW_DEFAULT_WORLD = L([
  'const hashKey = (value: string): number => {',
  '  let h = 5381;',
  '  for (let i = 0; i < value.length; i += 1) h = ((h * 33) ^ value.charCodeAt(i)) >>> 0;',
  '  return h;',
  '};',
  '',
  'const laneOptionsByType: Record<string, VisualLane[]> = {',
  '  hook: ["object_metaphor", "editorial_collage", "interface_reality"],',
  '  correction: ["editorial_collage", "diagram_world", "editorial_type"],',
  '  data_proof: ["evidence_desk", "data_theatre", "diagram_world"],',
  '  task_breakdown: ["diagram_world", "interface_reality"],',
  '  comparison: ["diagram_world", "data_theatre", "evidence_desk"],',
  '  outcome: ["editorial_type", "object_metaphor", "cinematic_context"],',
  '  closing_brand: ["editorial_type"],',
  '};',
  '',
  'const deviceOptionsByType: Record<string, NarrativeDeviceKind[]> = {',
  '  hook: ["two_tracks", "priority_signal", "evidence_scan"],',
  '  correction: ["decision_graph", "evidence_scan", "two_tracks"],',
  '  data_proof: ["evidence_scan", "priority_signal", "decision_graph"],',
  '  task_breakdown: ["task_system", "decision_graph"],',
  '  comparison: ["two_tracks", "decision_graph", "priority_signal"],',
  '  outcome: ["priority_signal", "decision_graph", "evidence_scan"],',
  '  closing_brand: [],',
  '};',
  '',
  'export const defaultVisualWorld = (',
  '  sceneId: string,',
  '  surface: SceneSurface,',
  '  type: string,',
  '  variationKey?: string,',
  '): VisualWorldSpec => {',
  '  const lanes = laneOptionsByType[type] ?? ["editorial_collage"];',
  '  const devices = deviceOptionsByType[type] ?? [];',
  '  const key = variationKey ?? sceneId;',
  '  const lane = lanes[hashKey(key + ":lane:" + type) % lanes.length] ?? "editorial_collage";',
  '  const device = devices.length > 0 ? devices[hashKey(key + ":device:" + type) % devices.length] : undefined;',
  '  const world: VisualWorldSpec = {',
  '    lane,',
  '    density: laneDefaults[lane].density,',
  '    seed: sceneId,',
  '    material: laneDefaults[lane].material,',
  '  };',
  '  if (device !== undefined) world.device = device;',
  '  return world;',
  '};',
]);

const HOOK_CONSTS = L([
  '  const s = surface ?? "dark";',
  '  const ink = s === "dark" ? colors.white : colors.black;',
  '  const bg = s === "dark" ? colors.black : s === "orange" ? colors.orange : colors.warmWhite;',
  '  const accent = s === "orange" ? colors.white : colors.orange;',
  '  const eyebrowColor = s === "dark" ? colors.gray300 : s === "orange" ? colors.black : colors.gray700;',
  '  return <EditorialFrame background={bg} color={ink} world={world} surface={s}>',
]);

const CORRECTION_CONSTS = L([
  '  const s = surface ?? "light";',
  '  const ink = s === "dark" ? colors.white : colors.black;',
  '  const bg = s === "dark" ? colors.black : s === "orange" ? colors.orange : colors.warmWhite;',
  '  const accent = s === "orange" ? colors.white : colors.orange;',
  '  const mutedInk = s === "dark" ? colors.gray300 : colors.gray700;',
  '  return <EditorialFrame background={bg} color={ink} world={world} surface={s}>',
]);

const plans = [
  {
    file: "app/remotion/src/visual/VisualWorld.tsx",
    ops: [
      {
        find: 'import type {SceneSurface, VisualDensity, VisualLane, VisualWorldSpec} from "../episodes/types";',
        replace: 'import type {NarrativeDeviceKind, SceneSurface, VisualDensity, VisualLane, VisualWorldSpec} from "../episodes/types";',
      },
      {find: OLD_DEFAULT_WORLD, replace: NEW_DEFAULT_WORLD},
    ],
  },
  {
    file: "app/remotion/src/compositions/GenericEpisode.tsx",
    ops: [
      {
        find: L(['  scene: EpisodeRenderScene;', '}> = ({scene}) => {']),
        replace: L(['  scene: EpisodeRenderScene;', '  episodeId: string;', '}> = ({scene, episodeId}) => {']),
      },
      {
        find: '...defaultVisualWorld(scene.id, scene.surface, scene.type),',
        replace: '...defaultVisualWorld(scene.id, scene.surface, scene.type, episodeId),',
      },
      {
        find: 'seed: scene.visualSystem?.seed ?? scene.id,',
        replace: 'seed: scene.visualSystem?.seed ?? episodeId + "-" + scene.id,',
      },
      {
        find: '<EpisodeScene scene={scene} />',
        replace: '<EpisodeScene scene={scene} episodeId={episodeId} />',
        count: 2,
      },
      {
        find: '> = ({scenes, captions}) => {',
        replace: '> = ({episodeId, scenes, captions}) => {',
      },
    ],
  },
  {
    file: "app/remotion/src/scenes/HookScene.tsx",
    ops: [
      {
        find: '  return <EditorialFrame background={colors.black} color={colors.white} world={world} surface={surface}>',
        replace: HOOK_CONSTS,
      },
      {find: 'surface={surface ?? "dark"}', replace: 'surface={s}'},
      {
        find: '<Eyebrow color={colors.gray300}>{eyebrow}</Eyebrow>',
        replace: '<Eyebrow color={eyebrowColor}>{eyebrow}</Eyebrow>',
      },
      {
        find: 'letterSpacing: -12, color: colors.orange',
        replace: 'letterSpacing: -12, color: accent',
      },
      {
        find: 'const workerColor = on ? colors.orange : colors.gray700;',
        replace: 'const workerColor = on ? accent : colors.gray700;',
      },
    ],
  },
  {
    file: "app/remotion/src/scenes/CorrectionScene.tsx",
    ops: [
      {
        find: '  return <EditorialFrame background={colors.warmWhite} world={world} surface={surface}>',
        replace: CORRECTION_CONSTS,
      },
      {find: 'surface={surface ?? "light"}', replace: 'surface={s}'},
      {
        find: '<Eyebrow>{eyebrow}</Eyebrow>',
        replace: '<Eyebrow color={mutedInk}>{eyebrow}</Eyebrow>',
      },
      {
        find: 'color: colors.gray700, textDecoration: "line-through", textDecorationColor: colors.orange',
        replace: 'color: mutedInk, textDecoration: "line-through", textDecorationColor: accent',
      },
      {find: 'color: colors.orange, transform', replace: 'color: accent, transform'},
      {find: 'background: colors.orange', replace: 'background: accent'},
    ],
  },
  {
    file: "app/pipeline/render.mjs",
    ops: [
      {find: 'chunked-v1', replace: 'chunked-v2'},
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
  fs.writeFileSync(r.abs + ".bak-v12a", fs.readFileSync(r.abs));
  fs.writeFileSync(r.abs, r.text);
  console.log("OK " + r.rel);
}
console.log("v1.2a diterapkan (backup: *.bak-v12a).");
