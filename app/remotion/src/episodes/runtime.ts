import type {
  EpisodeRenderProps,
  EpisodeSceneType,
  FormatFamily,
} from "./types";

const formatSceneRanges: Record<
  FormatFamily,
  readonly [number, number]
> = {
  big_idea_explainer: [5, 7],
  data_brief: [4, 6],
  strategy_breakdown: [5, 7],
  money_mechanism: [5, 7],
  career_framework: [4, 6],
  rapid_context: [4, 6],
  campaign_clip: [4, 7],
};

const allowedVariants: Record<
  EpisodeSceneType,
  readonly string[]
> = {
  hook: [
    "statistic",
    "contrarian",
    "question",
  ],
  correction: [
    "equation",
    "strike_replace",
    "reframe",
  ],
  data_proof: [
    "single_value",
    "proportion",
    "comparison",
    "timeline",
  ],
  task_breakdown: [
    "cards",
    "stack",
    "flow",
  ],
  comparison: [
    "split",
    "ladder",
    "timeline",
    "two_speed",
  ],
  outcome: [
    "statement",
    "question",
    "framework",
    "reframe",
  ],
  closing_brand: ["standard"],
};

export const getEpisodeDurationInFrames = (
  props: EpisodeRenderProps,
): number => {
  if (props.scenes.length === 0) {
    return 1;
  }

  return Math.max(
    ...props.scenes.map(
      (scene) =>
        scene.timing.from +
        scene.timing.durationInFrames,
    ),
  );
};

export const validateEpisodeRenderProps = (
  props: EpisodeRenderProps,
): string[] => {
  const errors: string[] = [];

  if (props.schemaVersion !== "1.1") {
    errors.push(
      "Runtime schemaVersion must be 1.1.",
    );
  }

  if (!props.episodeId.trim()) {
    errors.push("episodeId is required.");
  }

  if (!props.title.trim()) {
    errors.push("title is required.");
  }

  if (!props.voice || !props.voice.trim()) {
    errors.push("Runtime voice is required (configured in config/voices.json).");
  }

  const [minimum, maximum] =
    formatSceneRanges[props.formatFamily];

  if (
    props.scenes.length < minimum ||
    props.scenes.length > maximum
  ) {
    errors.push(
      `${props.formatFamily} requires ` +
        `${minimum}-${maximum} scenes, ` +
        `received ${props.scenes.length}.`,
    );
  }

  if (
    props.accountPhase === "warmup" &&
    props.contentOrigin === "campaign"
  ) {
    errors.push(
      "Campaign runtime is blocked during warmup.",
    );
  }

  if (props.contentOrigin === "original") {
    if (props.formatFamily === "campaign_clip") {
      errors.push(
        "Original runtime cannot use campaign_clip.",
      );
    }

    if (props.campaign !== null) {
      errors.push(
        "Original runtime campaign must be null.",
      );
    }
  }

  if (props.contentOrigin === "campaign") {
    if (props.accountPhase !== "mature") {
      errors.push(
        "Campaign runtime requires mature phase.",
      );
    }

    if (props.formatFamily !== "campaign_clip") {
      errors.push(
        "Campaign runtime must use campaign_clip.",
      );
    }

    if (props.campaign === null) {
      errors.push(
        "Campaign runtime metadata is missing.",
      );
    } else {
      if (!props.campaign.campaignId.trim()) {
        errors.push(
          "campaignId is required.",
        );
      }

      if (!props.campaign.campaignTitle.trim()) {
        errors.push(
          "campaignTitle is required.",
        );
      }

      if (!props.campaign.briefVerified) {
        errors.push(
          "Campaign brief must be verified.",
        );
      }

      if (!props.campaign.rightsVerified) {
        errors.push(
          "Campaign rights must be verified.",
        );
      }
    }
  }

  const roles = new Set(
    props.scenes.map((scene) => scene.role),
  );

  if (!roles.has("evidence")) {
    errors.push(
      "Episode runtime requires evidence role.",
    );
  }

  if (!roles.has("outcome")) {
    errors.push(
      "Episode runtime requires outcome role.",
    );
  }

  const firstScene = props.scenes[0];
  const lastScene =
    props.scenes[props.scenes.length - 1];

  if (
    firstScene &&
    (
      firstScene.role !== "hook" ||
      firstScene.type !== "hook"
    )
  ) {
    errors.push(
      "First runtime scene must be hook.",
    );
  }

  if (
    lastScene &&
    (
      lastScene.role !== "closing" ||
      lastScene.type !== "closing_brand"
    )
  ) {
    errors.push(
      "Final runtime scene must be closing_brand.",
    );
  }

  props.scenes.forEach((scene, index) => {
    const expectedId = `S${String(index + 1).padStart(
      2,
      "0",
    )}`;

    if (scene.id !== expectedId) {
      errors.push(
        `Scene ${index + 1} must use ID ${expectedId}.`,
      );
    }

    if (
      !allowedVariants[scene.type].includes(
        scene.variant,
      )
    ) {
      errors.push(
        `Scene ${scene.id} variant ` +
          `${scene.variant} is invalid for ` +
          `${scene.type}.`,
      );
    }

    if (!scene.narration.trim()) {
      errors.push(
        `Scene ${scene.id} narration is empty.`,
      );
    }

    if (!scene.audio.trim()) {
      errors.push(
        `Scene ${scene.id} audio path is empty.`,
      );
    }

    if (
      !Number.isInteger(scene.timing.from) ||
      scene.timing.from < 0
    ) {
      errors.push(
        `Scene ${scene.id} has invalid start frame.`,
      );
    }

    if (
      !Number.isInteger(
        scene.timing.durationInFrames,
      ) ||
      scene.timing.durationInFrames <= 0
    ) {
      errors.push(
        `Scene ${scene.id} has invalid duration.`,
      );
    }

    if (
      !Number.isFinite(
        scene.timing.speechSeconds,
      ) ||
      scene.timing.speechSeconds <= 0
    ) {
      errors.push(
        `Scene ${scene.id} has invalid speech duration.`,
      );
    }

    if (index > 0) {
      const previous = props.scenes[index - 1];
      const expectedFrom =
        previous.timing.from +
        previous.timing.durationInFrames;

      if (scene.timing.from !== expectedFrom) {
        errors.push(
          `Scene ${scene.id} must start at frame ` +
            `${expectedFrom}, got ` +
            `${scene.timing.from}.`,
        );
      }
    }
  });

  const duration =
    getEpisodeDurationInFrames(props);

  props.captions.forEach((cue, index) => {
    if (!Number.isInteger(cue.startFrame)) {
      errors.push(
        `Caption ${index + 1} startFrame is invalid.`,
      );
    }

    if (!Number.isInteger(cue.endFrame)) {
      errors.push(
        `Caption ${index + 1} endFrame is invalid.`,
      );
    }

    if (cue.startFrame < 0) {
      errors.push(
        `Caption ${index + 1} starts before frame 0.`,
      );
    }

    if (cue.endFrame <= cue.startFrame) {
      errors.push(
        `Caption ${index + 1} has invalid range.`,
      );
    }

    if (cue.endFrame > duration) {
      errors.push(
        `Caption ${index + 1} exceeds duration.`,
      );
    }

    if (!cue.text.trim()) {
      errors.push(
        `Caption ${index + 1} text is empty.`,
      );
    }

    if (
      cue.accent &&
      !cue.text
        .toLowerCase()
        .includes(cue.accent.toLowerCase())
    ) {
      errors.push(
        `Caption ${index + 1} accent is not in text.`,
      );
    }
  });

  for (
    let index = 1;
    index < props.captions.length;
    index += 1
  ) {
    const previous = props.captions[index - 1];
    const current = props.captions[index];

    if (
      current.startFrame <
      previous.endFrame
    ) {
      errors.push(
        `Caption ${index + 1} overlaps ` +
          "the previous cue.",
      );
    }
  }

  return errors;
};
