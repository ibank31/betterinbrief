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
