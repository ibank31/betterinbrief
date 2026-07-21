/**
 * PRODUCTION root. Registers exactly one composition: "Episode".
 * The episode content is NEVER hardcoded here - it always arrives as
 * input props generated from episode.locked.json by the pipeline.
 * Experiments live in index.lab.ts / lab-Root.tsx.
 */
import React from "react";
import {Composition} from "remotion";
import type {CalculateMetadataFunction} from "remotion";
import "./load-fonts";
import {canvas} from "./brand/tokens";
import {GenericEpisode} from "./compositions/GenericEpisode";
import type {EpisodeRenderProps} from "./episodes/types";
import {
  getEpisodeDurationInFrames,
  validateEpisodeRenderProps,
} from "./episodes/runtime";
import {templateEpisodeProps} from "./episodes/template-props";

const calculateEpisodeMetadata: CalculateMetadataFunction<
  EpisodeRenderProps
> = ({props}) => {
  const errors = validateEpisodeRenderProps(props);
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
  return {
    durationInFrames: getEpisodeDurationInFrames(props),
  };
};

export const ProductionRoot: React.FC = () => {
  return (
    <Composition
      id="Episode"
      component={GenericEpisode}
      calculateMetadata={calculateEpisodeMetadata}
      durationInFrames={300}
      fps={canvas.fps}
      width={canvas.width}
      height={canvas.height}
      defaultProps={templateEpisodeProps}
    />
  );
};
