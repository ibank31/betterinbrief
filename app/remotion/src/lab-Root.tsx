import React from "react";
import {Composition} from "remotion";
import type {CalculateMetadataFunction} from "remotion";
import {canvas, logo} from "./brand/tokens";
import {RuntimeTest} from "./compositions/RuntimeTest";
import {Seed01, SEED01_DURATION} from "./compositions/Seed01";
import {GenericEpisode} from "./compositions/GenericEpisode";
import {AnalystSpritePreview} from "./character/AnalystSpritePreview";
import {AnalystBackgroundQA} from "./character/AnalystBackgroundQA";
import {AnalystMotionQA} from "./character/AnalystMotionQA";
import {Seed01CharacterContentQA, Seed02CharacterContentQA} from "./character/RealContentCharacterQA";
import {seed01GenericProps} from "./content/seed01-generic-props";
import type {EpisodeRenderProps} from "./episodes/types";
import {
  getEpisodeDurationInFrames,
  validateEpisodeRenderProps,
} from "./episodes/runtime";
import {
  ClosingBrandPreview,
  ComparisonPreview,
  CorrectionPreview,
  DataProofPreview,
  HookPreview,
  OutcomePreview,
  TaskBreakdownPreview,
} from "./compositions/ModulePreviews";

const calculateEpisodeMetadata: CalculateMetadataFunction<EpisodeRenderProps> = ({props}) => {
  const errors = validateEpisodeRenderProps(props);
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
  return {
    durationInFrames: getEpisodeDurationInFrames(props),
  };
};

import {Seed02GoldMasterV2} from "./character/Seed02GoldMasterV2";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Seed02-Gold-Master-v2"
        component={Seed02GoldMasterV2}
        durationInFrames={630}
        fps={canvas.fps}
        width={canvas.width}
        height={canvas.height}
      />
      <Composition
        id="RuntimeTest"
        component={RuntimeTest}
        durationInFrames={90}
        fps={canvas.fps}
        width={canvas.width}
        height={canvas.height}
      />
      <Composition id="Module-Hook" component={HookPreview} durationInFrames={90} fps={canvas.fps} width={canvas.width} height={canvas.height} />
      <Composition id="Module-Correction" component={CorrectionPreview} durationInFrames={90} fps={canvas.fps} width={canvas.width} height={canvas.height} />
      <Composition id="Module-DataProof" component={DataProofPreview} durationInFrames={90} fps={canvas.fps} width={canvas.width} height={canvas.height} />
      <Composition id="Module-Comparison" component={ComparisonPreview} durationInFrames={90} fps={canvas.fps} width={canvas.width} height={canvas.height} />
      <Composition id="Module-TaskBreakdown" component={TaskBreakdownPreview} durationInFrames={90} fps={canvas.fps} width={canvas.width} height={canvas.height} />
      <Composition id="Module-Outcome" component={OutcomePreview} durationInFrames={90} fps={canvas.fps} width={canvas.width} height={canvas.height} />
      <Composition id="Module-ClosingBrand" component={ClosingBrandPreview} durationInFrames={logo.closing.durationFrames} fps={canvas.fps} width={canvas.width} height={canvas.height} />
      <Composition
        id="Seed01-Character-Content-QA-v1"
        component={Seed01CharacterContentQA}
        durationInFrames={630}
        fps={canvas.fps}
        width={canvas.width}
        height={canvas.height}
      />
      <Composition
        id="Seed02-Character-Content-QA-v1"
        component={Seed02CharacterContentQA}
        durationInFrames={540}
        fps={canvas.fps}
        width={canvas.width}
        height={canvas.height}
      />
      <Composition
        id="Character-Analyst-Motion-QA-v1"
        component={AnalystMotionQA}
        durationInFrames={360}
        fps={canvas.fps}
        width={canvas.width}
        height={canvas.height}
      />
      <Composition
        id="Character-Analyst-Background-QA"
        component={AnalystBackgroundQA}
        durationInFrames={360}
        fps={canvas.fps}
        width={canvas.width}
        height={canvas.height}
      />
      <Composition
        id="Character-Analyst-Sprite-v1"
        component={AnalystSpritePreview}
        durationInFrames={400}
        fps={canvas.fps}
        width={canvas.width}
        height={canvas.height}
      />
      <Composition
        id="Seed01"
        component={Seed01}
        durationInFrames={SEED01_DURATION}
        fps={canvas.fps}
        width={canvas.width}
        height={canvas.height}
      />
      <Composition
        id="Generic-Seed01-Regression"
        component={GenericEpisode}
        durationInFrames={SEED01_DURATION}
        fps={canvas.fps}
        width={canvas.width}
        height={canvas.height}
        defaultProps={seed01GenericProps}
      />
<Composition
        id="BinB-Episode"
        component={GenericEpisode}
        durationInFrames={SEED01_DURATION}
        fps={canvas.fps}
        width={canvas.width}
        height={canvas.height}
        defaultProps={seed01GenericProps}
        calculateMetadata={calculateEpisodeMetadata}
      />
    </>
  );
};
