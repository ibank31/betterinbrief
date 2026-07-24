import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {colors, motion} from "../brand/tokens";
import {logoAssets} from "../brand/logo-assets";
import type {
  EpisodeRenderProps,
  EpisodeRenderScene,
  VisualWorldSpec,
} from "../episodes/types";
import {CaptionOverlay} from "../scenes/CaptionOverlay";
import {ClosingBrandScene} from "../scenes/ClosingBrandScene";
import {ComparisonScene} from "../scenes/ComparisonScene";
import {CorrectionScene} from "../scenes/CorrectionScene";
import {DataProofScene} from "../scenes/DataProofScene";
import {HookScene} from "../scenes/HookScene";
import {OutcomeScene} from "../scenes/OutcomeScene";
import {TaskBreakdownScene} from "../scenes/TaskBreakdownScene";
import {
  VariantSceneFrame,
} from "../episodes/VariantSceneFrame";
import {defaultVisualWorld} from "../visual/VisualWorld";

const COLD_OPEN_SKIP_FRAMES = 14;

// Watermark brand kecil. Hanya tampil di surface "light": logo produksi
// (gelap) gagal kontras di scene dark, dan aksen orange logo hilang di
// surface orange. Closing brand sudah menampilkan logo besar.
const BrandWatermark: React.FC = () => (
  <Img
    src={staticFile(logoAssets.production)}
    style={{
      position: "absolute",
      top: 44,
      right: 48,
      width: 112,
      opacity: 0.2,
      zIndex: 30,
    }}
  />
);

// Progress bar tipis di tepi atas. Sinyal "video ini pendek, sebentar lagi
// selesai" — pola retensi yang terbukti menahan penonton di short-form.
const EpisodeProgress: React.FC<{totalFrames: number}> = ({totalFrames}) => {
  const frame = useCurrentFrame();
  const width = Math.min(100, (frame / Math.max(1, totalFrames)) * 100);
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        height: 10,
        width: `${width}%`,
        backgroundColor: colors.orange,
        zIndex: 1200,
      }}
    />
  );
};

// "Living frame": scene tidak pernah diam. Zoom drift pelan sepanjang scene
// (bergantian in/out per scene) supaya frame terasa hidup, bukan slide statis.
const LivingDrift: React.FC<React.PropsWithChildren<{
  index: number;
  durationInFrames: number;
}>> = ({index, durationInFrames, children}) => {
  const frame = useCurrentFrame();
  const progress = Math.min(1, frame / Math.max(1, durationInFrames));
  const zoomIn = index % 2 === 0;
  const scale = zoomIn ? 1 + progress * 0.05 : 1.055 - progress * 0.05;
  return (
    <AbsoluteFill style={{transform: `scale(${scale})`, transformOrigin: "50% 44%"}}>
      {children}
    </AbsoluteFill>
  );
};

// v1.3c — Kinetika batas scene. Setiap scene MASUK dengan fisika spring
// (arah di-seed per episodeId-sceneId: atas/kiri/kanan — tidak ada dua
// episode dengan ritme masuk identik) dan KELUAR dengan dorongan halus pada
// frame-frame terakhir, menyambung arah entrance scene berikutnya menjadi
// whip-cut. Transform-only: tanpa fade ke hitam, konten selalu terbaca
// (QC teks aman). Scene pertama tetap cold-open (tanpa entrance), scene
// terakhir tanpa dorongan keluar (closing brand berhenti tenang).
const SceneKinetics: React.FC<React.PropsWithChildren<{
  seed: string;
  index: number;
  last: boolean;
  durationInFrames: number;
}>> = ({seed, index, last, durationInFrames, children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const direction = Math.floor(random(seed + ":enter") * 3);
  const p = index === 0
    ? 1
    : spring({frame, fps, config: motion.spring.editorial});
  const exit = last
    ? 0
    : interpolate(
        frame,
        [durationInFrames - 9, durationInFrames - 1],
        [0, 1],
        {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
      );
  const enterX = direction === 1 ? -52 : direction === 2 ? 52 : 0;
  const enterY = direction === 0 ? 58 : 0;
  const x = (1 - p) * enterX - exit * enterX * 0.45;
  const y = (1 - p) * enterY - exit * 26;
  const scale = 1 - exit * 0.012;
  return (
    <AbsoluteFill style={{transform: `translate(${x}px, ${y}px) scale(${scale})`}}>
      {children}
    </AbsoluteFill>
  );
};

const EpisodeScene: React.FC<{
  scene: EpisodeRenderScene;
  episodeId: string;
}> = ({scene, episodeId}) => {
  const assetEntry = (scene.visualAssets ?? []).find((a) => typeof a.file === "string" && a.file.startsWith("assets/"));
  const mediaBase = assetEntry && assetEntry.file ? assetEntry.file.slice(7) : null;
  const world: VisualWorldSpec = {
    ...defaultVisualWorld(scene.id, scene.surface, scene.type, episodeId),
    ...scene.visualSystem,
    seed: scene.visualSystem?.seed ?? episodeId + "-" + scene.id,
  };
  if (mediaBase) {
    world.media = world.media ?? {
      src: "assets/" + episodeId + "/" + mediaBase,
      kind: (/\.(mp4|webm|mov)$/i).test(mediaBase) ? "video" : "image",
      treatment: assetEntry?.treatment === "hero" ? "hero" : "backdrop",
    };
  }
  switch (scene.type) {
    case "hook":
      return <HookScene {...scene.visual} world={world} surface={scene.surface} />;

    case "correction":
      return <CorrectionScene {...scene.visual} world={world} surface={scene.surface} />;

    case "data_proof":
      return (
        <DataProofScene
          {...scene.visual}
          world={world}
          surface={scene.surface}
          source={
            scene.variant === "comparison"
              ? ""
              : scene.visual.source
          }
        />
      );

    case "task_breakdown":
      return (
        <TaskBreakdownScene {...scene.visual} world={world} surface={scene.surface} />
      );

    case "comparison":
      return (
        <ComparisonScene {...scene.visual} world={world} surface={scene.surface} />
      );

    case "outcome":
      return (
        <OutcomeScene
          {...scene.visual}
          world={world}
          surface={scene.surface}
          question={
            scene.variant === "framework"
              ? ""
              : scene.visual.question
          }
        />
      );

    case "closing_brand":
      return (
        <ClosingBrandScene {...scene.visual} world={world} surface={scene.surface} />
      );

    default: {
      const exhaustiveCheck: never = scene;
      return exhaustiveCheck;
    }
  }
};

export const GenericEpisode: React.FC<
  EpisodeRenderProps
> = ({episodeId, scenes, captions}) => {
  const totalFrames = scenes.reduce(
    (acc, s) => Math.max(acc, s.timing.from + s.timing.durationInFrames),
    1,
  );
  // Captions harus tahu surface scene di bawahnya agar warnanya kontras
  // (perbaikan bug: caption putih di atas scene putih).
  const cues = captions.map((cue) => {
    const scene = scenes.find(
      (s) =>
        cue.startFrame >= s.timing.from &&
        cue.startFrame < s.timing.from + s.timing.durationInFrames,
    );
    return scene ? {...cue, surface: cue.surface ?? scene.surface} : cue;
  });
  return (
    <AbsoluteFill
      style={{backgroundColor: colors.black}}
    >
      {scenes.map((scene, index) => (
        <Sequence
          key={scene.id}
          from={scene.timing.from}
          durationInFrames={
            scene.timing.durationInFrames
          }
        >
          <SceneKinetics
            seed={episodeId + "-" + scene.id}
            index={index}
            last={index === scenes.length - 1}
            durationInFrames={scene.timing.durationInFrames}
          >
            <LivingDrift
              index={index}
              durationInFrames={scene.timing.durationInFrames}
            >
              {index === 0 ? (
                // Cold open: scene pertama mulai dengan entrance sudah berjalan
                // agar frame 0 langsung menampilkan konten (aturan brand: hook
                // mendarat segera, tanpa black opening).
                <Sequence
                  from={-COLD_OPEN_SKIP_FRAMES}
                  layout="none"
                >
                  <VariantSceneFrame scene={scene}>
                    <EpisodeScene scene={scene} episodeId={episodeId} />
                  </VariantSceneFrame>
                </Sequence>
              ) : (
                <VariantSceneFrame scene={scene}>
                  <EpisodeScene scene={scene} episodeId={episodeId} />
                </VariantSceneFrame>
              )}
            </LivingDrift>
          </SceneKinetics>
          {scene.surface === "light" &&
          scene.type !== "closing_brand" ? (
            <BrandWatermark />
          ) : null}
          <Audio src={staticFile(scene.audio)} />
        </Sequence>
      ))}

      <CaptionOverlay cues={cues} />
      <EpisodeProgress totalFrames={totalFrames} />
    </AbsoluteFill>
  );
};
