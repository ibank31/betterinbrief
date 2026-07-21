/**
 * Neutral placeholder used ONLY as Studio defaultProps so the production
 * composition can open without an episode. This is not episode content;
 * real renders always receive props compiled from episode.locked.json.
 */
import type {EpisodeRenderProps} from "./types";

const second = 30;

const timing = (index: number): {
  from: number;
  durationInFrames: number;
  speechSeconds: number;
} => ({
  from: index * 3 * second,
  durationInFrames: 3 * second,
  speechSeconds: 2.5,
});

export const templateEpisodeProps: EpisodeRenderProps = {
  schemaVersion: "1.1",
  accountPhase: "warmup",
  contentOrigin: "original",
  episodeId: "Template",
  title: "Template episode",
  pillar: "ai_technology_work",
  formatFamily: "big_idea_explainer",
  voice: "af_sarah",
  musicLane: "technology_change",
  campaign: null,
  scenes: [
    {
      id: "S01", role: "hook", type: "hook", variant: "statistic",
      surface: "dark", motion: "measured_reveal",
      narration: "Template hook narration.",
      audio: "audio/template/S01.wav", timing: timing(0),
      visual: {eyebrow: "TEMPLATE", statistic: "1", statisticSuffix: "IN 4", headline: "template headline placeholder", highlightedIndex: 2},
    },
    {
      id: "S02", role: "correction", type: "correction", variant: "equation",
      surface: "light", motion: "sharp_correction",
      narration: "Template correction narration.",
      audio: "audio/template/S02.wav", timing: timing(1),
      visual: {eyebrow: "TEMPLATE", misconception: "BEFORE", correction: "AFTER", symbol: "\u2260"},
    },
    {
      id: "S03", role: "evidence", type: "data_proof", variant: "single_value",
      surface: "dark", motion: "measured_reveal",
      narration: "Template evidence narration.",
      audio: "audio/template/S03.wav", timing: timing(2),
      visual: {eyebrow: "TEMPLATE", value: 3.3, decimals: 1, suffix: "%", label: "template data label", source: "SOURCE \u00b7 TEMPLATE"},
    },
    {
      id: "S04", role: "outcome", type: "outcome", variant: "statement",
      surface: "orange", motion: "restrained_lift",
      narration: "Template outcome narration.",
      audio: "audio/template/S04.wav", timing: timing(3),
      visual: {eyebrow: "TEMPLATE", setup: "Template setup.", outcome: "OUTCOME", comparison: "> BASELINE", question: "TEMPLATE QUESTION?"},
    },
    {
      id: "S05", role: "closing", type: "closing_brand", variant: "standard",
      surface: "light", motion: "restrained_lift",
      narration: "Big ideas. Briefly.",
      audio: "audio/template/S05.wav", timing: timing(4),
      visual: {tagline: "Big ideas. Briefly."},
    },
  ],
  captions: [
    {startFrame: 0, endFrame: 60, text: "Template caption"},
  ],
};
