import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
} from "remotion";
import {colors} from "../brand/tokens";
import {
  seed01Captions,
  seed01DurationInFrames,
  seed01Timing,
} from "../content/seed01-timing";
import {CaptionOverlay} from "../scenes/CaptionOverlay";
import {ClosingBrandScene} from "../scenes/ClosingBrandScene";
import {ComparisonScene} from "../scenes/ComparisonScene";
import {CorrectionScene} from "../scenes/CorrectionScene";
import {DataProofScene} from "../scenes/DataProofScene";
import {HookScene} from "../scenes/HookScene";
import {OutcomeScene} from "../scenes/OutcomeScene";
import {TaskBreakdownScene} from "../scenes/TaskBreakdownScene";

export const SEED01_DURATION =
  seed01DurationInFrames;

const audio = (index: number) =>
  staticFile(seed01Timing[index].audio);

export const Seed01: React.FC = () => {
  return (
    <AbsoluteFill
      style={{backgroundColor: colors.black}}
    >
      <Sequence
        from={seed01Timing[0].from}
        durationInFrames={
          seed01Timing[0].durationInFrames
        }
      >
        <HookScene
          eyebrow="AI · TECHNOLOGY · WORK"
          statistic="1"
          statisticSuffix="IN 4"
          headline="workers may see their work reshaped by AI"
          highlightedIndex={2}
        />
        <Audio src={audio(0)} />
      </Sequence>

      <Sequence
        from={seed01Timing[1].from}
        durationInFrames={
          seed01Timing[1].durationInFrames
        }
      >
        <CorrectionScene
          eyebrow="THE HEADLINE GETS THIS WRONG"
          misconception="EXPOSURE"
          correction="REPLACEMENT"
          symbol="≠"
        />
        <Audio src={audio(1)} />
      </Sequence>

      <Sequence
        from={seed01Timing[2].from}
        durationInFrames={
          seed01Timing[2].durationInFrames
        }
      >
        <DataProofScene
          eyebrow="WHAT THE DATA ACTUALLY SAYS"
          value={3.3}
          decimals={1}
          suffix="%"
          label="falls into the highest exposure category"
          source="SOURCE · INTERNATIONAL LABOUR ORGANIZATION"
        />
        <Audio src={audio(2)} />
      </Sequence>

      <Sequence
        from={seed01Timing[3].from}
        durationInFrames={
          seed01Timing[3].durationInFrames
        }
      >
        <TaskBreakdownScene
          eyebrow="LOOK INSIDE THE JOB"
          headline="A JOB IS A BUNDLE OF TASKS"
          jobTitle="KNOWLEDGE WORK"
          tasks={[
            {label: "Analysis", shifts: true},
            {label: "Writing", shifts: true},
            {label: "Judgment", shifts: false},
            {label: "Context", shifts: false},
            {label: "Trust", shifts: false},
          ]}
        />
        <Audio src={audio(3)} />
      </Sequence>

      <Sequence
        from={seed01Timing[4].from}
        durationInFrames={
          seed01Timing[4].durationInFrames
        }
      >
        <ComparisonScene
          eyebrow="THE SHIFT IS UNEVEN"
          leftLabel="JOB TITLE"
          leftValue="STAYS"
          rightLabel="TASK MIX"
          rightValue="MOVES"
          verdict="The role changes before the title does."
        />
        <Audio src={audio(4)} />
      </Sequence>

      <Sequence
        from={seed01Timing[5].from}
        durationInFrames={
          seed01Timing[5].durationInFrames
        }
      >
        <OutcomeScene
          eyebrow="THE MORE LIKELY OUTCOME"
          setup="The title may stay. The work underneath it moves."
          outcome="TRANSFORMATION"
          comparison="> REPLACEMENT"
          question="CAN YOUR SKILLS KEEP UP?"
        />
        <Audio src={audio(5)} />
      </Sequence>

      <Sequence
        from={seed01Timing[6].from}
        durationInFrames={
          seed01Timing[6].durationInFrames
        }
      >
        <ClosingBrandScene
          tagline="Big ideas. Briefly."
        />
        <Audio src={audio(6)} />
      </Sequence>

      <CaptionOverlay cues={seed01Captions} />
    </AbsoluteFill>
  );
};
