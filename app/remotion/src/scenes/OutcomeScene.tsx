import React from "react";
import {interpolate, useCurrentFrame} from "remotion";
import {colors, motion, safeZones, typography} from "../brand/tokens";
import {EditorialFrame, EditorialSubtitle, Eyebrow, SceneBaseProps, clamp} from "./shared";

export type OutcomeSceneProps=SceneBaseProps&{eyebrow:string;setup:string;outcome:string;comparison:string;question:string};
export const OutcomeScene:React.FC<OutcomeSceneProps>=({eyebrow,setup,outcome,comparison,question,subtitle})=>{
 const frame=useCurrentFrame();
 const reveal=interpolate(frame,[6,motion.emphasis],[0,1],clamp);
 const q=interpolate(frame,[24,38],[0,1],clamp);
 return <EditorialFrame background={colors.orange} color={colors.black}>
  <div style={{position:"absolute",left:safeZones.left,top:safeZones.top,width:880}}>
   <Eyebrow color={colors.black72}>{eyebrow}</Eyebrow>
   <div style={{marginTop:70,maxWidth:760,fontSize:typography.size.title,lineHeight:typography.lineHeight.title,fontWeight:typography.weight.semibold}}>{setup}</div>
   <div style={{marginTop:76,maxWidth:840,fontSize:92,lineHeight:.94,fontWeight:typography.weight.black,letterSpacing:typography.letterSpacing.tight,opacity:reveal,transform:`translateY(${(1-reveal)*54}px)`}}>{outcome}</div>
   <div style={{marginTop:36,fontSize:typography.size.display,lineHeight:1,fontWeight:typography.weight.black,color:colors.white,letterSpacing:typography.letterSpacing.display}}>{comparison}</div>
  </div>
  <div style={{position:"absolute",left:220,top:1115,width:730,borderTop:`8px solid ${colors.black}`,paddingTop:34,fontSize:typography.size.headline,lineHeight:typography.lineHeight.headline,fontWeight:typography.weight.black,opacity:q}}>{question}</div>
  <EditorialSubtitle text={subtitle} color={colors.black72}/>
 </EditorialFrame>
};
