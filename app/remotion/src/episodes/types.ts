import type {CaptionCue} from "../scenes/CaptionOverlay";

export type AccountPhase =
  | "warmup"
  | "mature";

export type ContentOrigin =
  | "original"
  | "campaign";

export type ContentPillar =
  | "ai_technology_work"
  | "company_founder_strategy"
  | "money_everyday_economics"
  | "career_decision_frameworks";

export type FormatFamily =
  | "big_idea_explainer"
  | "data_brief"
  | "strategy_breakdown"
  | "money_mechanism"
  | "career_framework"
  | "rapid_context"
  | "campaign_clip";

export type MusicLane =
  | "technology_change"
  | "business_strategy"
  | "money_people_decisions";

export type NarrativeRole =
  | "hook"
  | "context"
  | "example"
  | "correction"
  | "evidence"
  | "mechanism"
  | "breakdown"
  | "comparison"
  | "decision"
  | "outcome"
  | "closing";

export type SceneSurface =
  | "dark"
  | "light"
  | "orange";

/**
 * A visual lane is a reusable storytelling language, not a fixed scene
 * template. New episodes may choose a lane explicitly; old episodes receive
 * a safe type-based default at render time.
 */
export type VisualLane =
  | "editorial_collage"
  | "evidence_desk"
  | "diagram_world"
  | "object_metaphor"
  | "interface_reality"
  | "cinematic_context"
  | "data_theatre"
  | "editorial_type";

export type VisualDensity = "quiet" | "editorial" | "dense";

/** A concrete visual metaphor selected for an individual argument. */
export type NarrativeDeviceKind =
  | "two_tracks"
  | "evidence_scan"
  | "decision_graph"
  | "task_system"
  | "priority_signal";

export type VisualWorldSpec = {
  lane: VisualLane;
  density: VisualDensity;
  /** Stable per-scene seed prevents repeated procedural compositions. */
  seed: string;
  material: "paper" | "scan" | "grid" | "grain" | "halftone";
  /** Optional scene-level metaphor. Components provide a safe type default. */
  device?: NarrativeDeviceKind;
  /** Optional media backdrop staged by tools/assets-fetch.mjs. */
  media?: {src: string; kind: "image" | "video"; opacity?: number; treatment?: "backdrop" | "hero"};
};

export type SceneMotion =
  | "measured_reveal"
  | "sharp_correction"
  | "left_to_right"
  | "stacked_build"
  | "subtraction"
  | "restrained_lift";

export type EpisodeSceneType =
  | "hook"
  | "correction"
  | "data_proof"
  | "task_breakdown"
  | "comparison"
  | "outcome"
  | "closing_brand";

export type HookVariant =
  | "statistic"
  | "contrarian"
  | "question";

export type CorrectionVariant =
  | "equation"
  | "strike_replace"
  | "reframe";

export type DataProofVariant =
  | "single_value"
  | "proportion"
  | "comparison"
  | "timeline";

export type TaskBreakdownVariant =
  | "cards"
  | "stack"
  | "flow";

export type ComparisonVariant =
  | "split"
  | "ladder"
  | "timeline"
  | "two_speed";

export type OutcomeVariant =
  | "statement"
  | "question"
  | "framework"
  | "reframe";

export type ClosingBrandVariant = "standard";

export type SceneTiming = {
  from: number;
  durationInFrames: number;
  speechSeconds: number;
};

export type CampaignMetadata = {
  campaignId: string;
  campaignTitle: string;
  briefVerified: boolean;
  rightsVerified: boolean;
};

export type HookVisual = {
  eyebrow: string;
  statistic: string;
  statisticSuffix: string;
  headline: string;
  subtitle?: string;
  highlightedIndex?: number;
};

export type CorrectionVisual = {
  eyebrow: string;
  misconception: string;
  correction: string;
  symbol?: string;
  subtitle?: string;
};

export type DataProofVisual = {
  eyebrow: string;
  value: number;
  decimals?: number;
  suffix?: string;
  label: string;
  source: string;
  subtitle?: string;
};

export type TaskItem = {
  label: string;
  shifts: boolean;
};

export type TaskBreakdownVisual = {
  eyebrow: string;
  headline: string;
  jobTitle: string;
  tasks: TaskItem[];
  subtitle?: string;
};

export type ComparisonVisual = {
  eyebrow: string;
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
  verdict: string;
  subtitle?: string;
};

export type OutcomeVisual = {
  eyebrow: string;
  setup: string;
  outcome: string;
  comparison: string;
  question: string;
  subtitle?: string;
};

export type ClosingBrandVisual = {
  tagline: string;
  closingLine?: string;
};

type EpisodeSceneBase<
  TType extends EpisodeSceneType,
  TVariant extends string,
  TVisual,
> = {
  id: string;
  role: NarrativeRole;
  type: TType;
  variant: TVariant;
  surface: SceneSurface;
  motion: SceneMotion;
  /** Optional authoring override. Absent values are resolved by the system. */
  visualSystem?: Partial<VisualWorldSpec>;
  /** Optional evidence/context asset layer (divalidasi validate.mjs). */
  visualAssets?: Array<{
    assetId: string;
    role: string;
    kind: string;
    rightsStatus: string;
    file?: string;
    sourceId?: string;
    licenseUrl?: string;
    attribution?: string;
    editorialPurpose?: string;
    claimIds?: string[];
    treatment?: string;
    fetch?: Record<string, unknown>;
  }>;
  narration: string;
  audio: string;
  timing: SceneTiming;
  visual: TVisual;
};

export type HookEpisodeScene = EpisodeSceneBase<
  "hook",
  HookVariant,
  HookVisual
>;

export type CorrectionEpisodeScene = EpisodeSceneBase<
  "correction",
  CorrectionVariant,
  CorrectionVisual
>;

export type DataProofEpisodeScene = EpisodeSceneBase<
  "data_proof",
  DataProofVariant,
  DataProofVisual
>;

export type TaskBreakdownEpisodeScene = EpisodeSceneBase<
  "task_breakdown",
  TaskBreakdownVariant,
  TaskBreakdownVisual
>;

export type ComparisonEpisodeScene = EpisodeSceneBase<
  "comparison",
  ComparisonVariant,
  ComparisonVisual
>;

export type OutcomeEpisodeScene = EpisodeSceneBase<
  "outcome",
  OutcomeVariant,
  OutcomeVisual
>;

export type ClosingBrandEpisodeScene = EpisodeSceneBase<
  "closing_brand",
  ClosingBrandVariant,
  ClosingBrandVisual
>;

export type EpisodeRenderScene =
  | HookEpisodeScene
  | CorrectionEpisodeScene
  | DataProofEpisodeScene
  | TaskBreakdownEpisodeScene
  | ComparisonEpisodeScene
  | OutcomeEpisodeScene
  | ClosingBrandEpisodeScene;

export type EpisodeRenderProps = {
  schemaVersion: "1.1";
  accountPhase: AccountPhase;
  contentOrigin: ContentOrigin;
  episodeId: string;
  title: string;
  pillar: ContentPillar;
  formatFamily: FormatFamily;
  voice: "af_sarah";
  musicLane: MusicLane;
  campaign: CampaignMetadata | null;
  scenes: readonly EpisodeRenderScene[];
  captions: readonly CaptionCue[];
};
