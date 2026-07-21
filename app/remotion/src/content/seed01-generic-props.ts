import type {EpisodeRenderProps} from "../episodes/types";
import {
  seed01Captions,
  seed01Timing,
} from "./seed01-timing";

export const seed01GenericProps: EpisodeRenderProps = {
  schemaVersion: "1.1",
  accountPhase: "warmup",
  contentOrigin: "original",
  episodeId: "Seed01",
  title:
    "AI Will Transform Jobs, Not Simply Replace Them",
  pillar: "ai_technology_work",
  formatFamily: "big_idea_explainer",
  voice: "af_sarah",
  musicLane: "technology_change",
  campaign: null,
  scenes: [
    {
      id: "S01",
      role: "hook",
      type: "hook",
      variant: "statistic",
      surface: "dark",
      motion: "measured_reveal",
      narration:
        "AI could affect one in four workers worldwide.",
      audio: seed01Timing[0].audio,
      timing: {
        from: seed01Timing[0].from,
        durationInFrames:
          seed01Timing[0].durationInFrames,
        speechSeconds:
          seed01Timing[0].speechSeconds,
      },
      visual: {
        eyebrow: "AI · TECHNOLOGY · WORK",
        statistic: "1",
        statisticSuffix: "IN 4",
        headline:
          "workers may see their work reshaped by AI",
        highlightedIndex: 2,
      },
    },
    {
      id: "S02",
      role: "correction",
      type: "correction",
      variant: "equation",
      surface: "light",
      motion: "sharp_correction",
      narration:
        "But that does not mean one in four jobs will disappear.",
      audio: seed01Timing[1].audio,
      timing: {
        from: seed01Timing[1].from,
        durationInFrames:
          seed01Timing[1].durationInFrames,
        speechSeconds:
          seed01Timing[1].speechSeconds,
      },
      visual: {
        eyebrow: "THE HEADLINE GETS THIS WRONG",
        misconception: "EXPOSURE",
        correction: "REPLACEMENT",
        symbol: "≠",
      },
    },
    {
      id: "S03",
      role: "evidence",
      type: "data_proof",
      variant: "single_value",
      surface: "dark",
      motion: "measured_reveal",
      narration:
        "The International Labour Organization found that only 3.3 percent of global employment falls into its highest exposure category.",
      audio: seed01Timing[2].audio,
      timing: {
        from: seed01Timing[2].from,
        durationInFrames:
          seed01Timing[2].durationInFrames,
        speechSeconds:
          seed01Timing[2].speechSeconds,
      },
      visual: {
        eyebrow: "WHAT THE DATA ACTUALLY SAYS",
        value: 3.3,
        decimals: 1,
        suffix: "%",
        label:
          "falls into the highest exposure category",
        source:
          "SOURCE · INTERNATIONAL LABOUR ORGANIZATION",
      },
    },
    {
      id: "S04",
      role: "breakdown",
      type: "task_breakdown",
      variant: "cards",
      surface: "dark",
      motion: "stacked_build",
      narration:
        "Most jobs are bundles of different tasks—and many still require human judgment, context, and interaction.",
      audio: seed01Timing[3].audio,
      timing: {
        from: seed01Timing[3].from,
        durationInFrames:
          seed01Timing[3].durationInFrames,
        speechSeconds:
          seed01Timing[3].speechSeconds,
      },
      visual: {
        eyebrow: "LOOK INSIDE THE JOB",
        headline: "A JOB IS A BUNDLE OF TASKS",
        jobTitle: "KNOWLEDGE WORK",
        tasks: [
          {label: "Analysis", shifts: true},
          {label: "Writing", shifts: true},
          {label: "Judgment", shifts: false},
          {label: "Context", shifts: false},
          {label: "Trust", shifts: false},
        ],
      },
    },
    {
      id: "S05",
      role: "comparison",
      type: "comparison",
      variant: "split",
      surface: "light",
      motion: "left_to_right",
      narration:
        "So the most likely outcome isn’t simple replacement. It’s job transformation.",
      audio: seed01Timing[4].audio,
      timing: {
        from: seed01Timing[4].from,
        durationInFrames:
          seed01Timing[4].durationInFrames,
        speechSeconds:
          seed01Timing[4].speechSeconds,
      },
      visual: {
        eyebrow: "THE SHIFT IS UNEVEN",
        leftLabel: "JOB TITLE",
        leftValue: "STAYS",
        rightLabel: "TASK MIX",
        rightValue: "MOVES",
        verdict:
          "The role changes before the title does.",
      },
    },
    {
      id: "S06",
      role: "outcome",
      type: "outcome",
      variant: "statement",
      surface: "orange",
      motion: "restrained_lift",
      narration:
        "The real career risk may not be AI taking your job. It may be your job changing faster than your skills.",
      audio: seed01Timing[5].audio,
      timing: {
        from: seed01Timing[5].from,
        durationInFrames:
          seed01Timing[5].durationInFrames,
        speechSeconds:
          seed01Timing[5].speechSeconds,
      },
      visual: {
        eyebrow: "THE MORE LIKELY OUTCOME",
        setup:
          "The title may stay. The work underneath it moves.",
        outcome: "TRANSFORMATION",
        comparison: "> REPLACEMENT",
        question: "CAN YOUR SKILLS KEEP UP?",
      },
    },
    {
      id: "S07",
      role: "closing",
      type: "closing_brand",
      variant: "standard",
      surface: "light",
      motion: "restrained_lift",
      narration: "Big ideas. Briefly.",
      audio: seed01Timing[6].audio,
      timing: {
        from: seed01Timing[6].from,
        durationInFrames:
          seed01Timing[6].durationInFrames,
        speechSeconds:
          seed01Timing[6].speechSeconds,
      },
      visual: {
        tagline: "Big ideas. Briefly.",
      },
    },
  ],
  captions: seed01Captions,
};
