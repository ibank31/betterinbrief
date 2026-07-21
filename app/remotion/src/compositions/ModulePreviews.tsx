import React from "react";
import {ClosingBrandScene} from "../scenes/ClosingBrandScene";
import {ComparisonScene} from "../scenes/ComparisonScene";
import {CorrectionScene} from "../scenes/CorrectionScene";
import {DataProofScene} from "../scenes/DataProofScene";
import {HookScene} from "../scenes/HookScene";
import {OutcomeScene} from "../scenes/OutcomeScene";
import {TaskBreakdownScene} from "../scenes/TaskBreakdownScene";

export const HookPreview:React.FC=()=> <HookScene eyebrow="AI · TECHNOLOGY · WORK" statistic="1" statisticSuffix="IN 4" headline="workers may see their work reshaped by AI" subtitle="AI could affect one in four workers worldwide." highlightedIndex={2}/>;
export const CorrectionPreview:React.FC=()=> <CorrectionScene eyebrow="THE HEADLINE GETS THIS WRONG" misconception="EXPOSURE" correction="REPLACEMENT" symbol="≠" subtitle="Exposure does not mean one in four jobs disappear."/>;
export const DataProofPreview:React.FC=()=> <DataProofScene eyebrow="WHAT THE DATA ACTUALLY SAYS" value={3.3} label="falls into the highest exposure category" source="SOURCE · INTERNATIONAL LABOUR ORGANIZATION" subtitle="Only 3.3 percent of global employment is in the highest category."/>;
export const ComparisonPreview:React.FC=()=> <ComparisonScene eyebrow="THE SHIFT IS UNEVEN" leftLabel="JOB TITLE" leftValue="STAYS" rightLabel="TASK MIX" rightValue="MOVES" verdict="The role changes before the title does." subtitle="A job is not one action. It is a changing bundle."/>;
export const TaskBreakdownPreview:React.FC=()=> <TaskBreakdownScene eyebrow="LOOK INSIDE THE JOB" headline="A JOB IS A BUNDLE OF TASKS" jobTitle="KNOWLEDGE WORK" tasks={[{label:"Analysis",shifts:true},{label:"Writing",shifts:true},{label:"Judgment",shifts:false},{label:"Context",shifts:false},{label:"Trust",shifts:false}]} subtitle="AI shifts selected tasks—not every human responsibility."/>;
export const OutcomePreview:React.FC=()=> <OutcomeScene eyebrow="THE MORE LIKELY OUTCOME" setup="The title may stay. The work underneath it moves." outcome="TRANSFORMATION" comparison="> REPLACEMENT" question="CAN YOUR SKILLS KEEP UP?" subtitle="The real risk is work changing faster than skills."/>;
export const ClosingBrandPreview:React.FC=()=> <ClosingBrandScene closingLine="Understand the shift before it becomes obvious." tagline="Big ideas. Briefly."/>;
