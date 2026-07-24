import React from "react";
import type {EpisodeRenderScene, VisualWorldSpec} from "../episodes/types";
import {BeforeAfterScene} from "./BeforeAfterScene";
import {ClosingBrandScene} from "./ClosingBrandScene";
import {ComparisonScene} from "./ComparisonScene";
import {CorrectionScene} from "./CorrectionScene";
import {DataProofScene} from "./DataProofScene";
import {HookScene} from "./HookScene";
import {OutcomeScene} from "./OutcomeScene";
import {ProcessScene} from "./ProcessScene";
import {QuoteScene} from "./QuoteScene";
import {RankingScene} from "./RankingScene";
import {TaskBreakdownScene} from "./TaskBreakdownScene";
import {TimelineScene} from "./TimelineScene";

// v1.4a - Kamus scene (sisi renderer). Pasangan deklaratifnya untuk
// authoring & validasi adalah config/scene-catalog.json (dibaca oleh
// app/pipeline/validate.mjs). Menambah tipe scene = 4 langkah:
// 1) daftarkan di config/scene-catalog.json,
// 2) tambahkan tipenya di episodes/types.ts + schemas/episode.schema.json,
// 3) buat komponennya di scenes/ dan daftarkan di switch ini,
// 4) tambahkan default variant + lane/device mapping di VariantSceneFrame
//    dan VisualWorld.
// Exhaustive-check `never` di bawah menjaga registry selalu lengkap saat
// `npm run typecheck` - tipe baru tanpa renderer gagal compile, bukan
// gagal diam-diam saat render.
export const renderScene = (
  scene: EpisodeRenderScene,
  world: VisualWorldSpec,
): React.ReactElement => {
  switch (scene.type) {
    case "hook":
      return <HookScene {...scene.visual} world={world} surface={scene.surface} />;
    case "correction":
      return <CorrectionScene {...scene.visual} world={world} surface={scene.surface} />;
    case "data_proof":
      return <DataProofScene {...scene.visual} world={world} surface={scene.surface} source={scene.variant === "comparison" ? "" : scene.visual.source} />;
    case "task_breakdown":
      return <TaskBreakdownScene {...scene.visual} world={world} surface={scene.surface} />;
    case "comparison":
      return <ComparisonScene {...scene.visual} world={world} surface={scene.surface} />;
    case "outcome":
      return <OutcomeScene {...scene.visual} world={world} surface={scene.surface} question={scene.variant === "framework" ? "" : scene.visual.question} />;
    case "closing_brand":
      return <ClosingBrandScene {...scene.visual} world={world} surface={scene.surface} />;
    case "timeline":
      return <TimelineScene {...scene.visual} world={world} surface={scene.surface} />;
    case "ranking":
      return <RankingScene {...scene.visual} world={world} surface={scene.surface} />;
    case "before_after":
      return <BeforeAfterScene {...scene.visual} world={world} surface={scene.surface} />;
    case "process":
      return <ProcessScene {...scene.visual} world={world} surface={scene.surface} />;
    case "quote":
      return <QuoteScene {...scene.visual} world={world} surface={scene.surface} />;
    default: {
      const exhaustiveCheck: never = scene;
      return exhaustiveCheck;
    }
  }
};
