import React from "react";
import {interpolate, useCurrentFrame} from "remotion";
import {colors, safeZones, typography} from "../brand/tokens";
import {EditorialFrame, EditorialSubtitle, Eyebrow, SceneBaseProps, clamp} from "./shared";

export type TaskItem = {label:string; shifts:boolean};
export type TaskBreakdownSceneProps = SceneBaseProps & {eyebrow:string; headline:string; jobTitle:string; tasks:TaskItem[]};

export const TaskBreakdownScene:React.FC<TaskBreakdownSceneProps>=({eyebrow,headline,jobTitle,tasks,subtitle})=>{
 const frame=useCurrentFrame();
 return <EditorialFrame background={colors.graphite} color={colors.white}>
  <div style={{position:"absolute",left:safeZones.left,top:safeZones.top,width:880}}>
   <Eyebrow color={colors.gray300}>{eyebrow}</Eyebrow>
   <div style={{marginTop:52,maxWidth:800,fontSize:typography.size.headline,lineHeight:typography.lineHeight.headline,fontWeight:typography.weight.black,letterSpacing:typography.letterSpacing.headline}}>{headline}</div>
   <div style={{marginTop:72,fontSize:typography.size.caption,fontWeight:typography.weight.bold,letterSpacing:typography.letterSpacing.wideLabel,color:colors.orange}}>{jobTitle}</div>
   <div style={{marginTop:28}}>{tasks.slice(0,5).map((task,i)=>{const p=interpolate(frame,[8+i*4,20+i*4],[0,1],clamp); return <div key={task.label} style={{height:118,borderTop:`1px solid ${colors.gray700}`,display:"flex",alignItems:"center",opacity:p,transform:`translateX(${(1-p)*(i%2?42:-42)}px)`}}><span style={{width:70,fontSize:typography.size.source,color:colors.gray500,fontWeight:typography.weight.bold}}>0{i+1}</span><span style={{fontSize:typography.size.body,fontWeight:typography.weight.semibold,flex:1}}>{task.label}</span><span style={{width:task.shifts?160:56,height:12,background:task.shifts?colors.orange:colors.gray700}}/></div>})}</div>
  </div>
  <EditorialSubtitle text={subtitle} color={colors.white72} accent="tasks"/>
 </EditorialFrame>
};
