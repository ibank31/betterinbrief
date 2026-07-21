import React from "react";
import {Img, interpolate, staticFile, useCurrentFrame} from "remotion";
import {colors, logo, safeZones, typography} from "../brand/tokens";
import {logoAssets} from "../brand/logo-assets";
import {EditorialFrame, clamp, SceneBaseProps} from "./shared";

export type ClosingBrandSceneProps=SceneBaseProps&{tagline:string;closingLine?:string};
export const ClosingBrandScene:React.FC<ClosingBrandSceneProps>=({tagline,closingLine,world,surface})=>{
 const frame=useCurrentFrame();
 const enter=interpolate(frame,[4,20],[0,1],clamp);
 const line=interpolate(frame,[18,32],[0,1],clamp);
 return <EditorialFrame background={colors.warmWhite} textureOn={false} world={world} surface={surface}>
  <div style={{position:"absolute",left:safeZones.left,top:300,width:880,opacity:enter,transform:`translateY(${(1-enter)*36}px)`}}>
   {closingLine?<div style={{maxWidth:760,fontSize:typography.size.title,lineHeight:typography.lineHeight.title,fontWeight:typography.weight.semibold,color:colors.gray700,marginBottom:100}}>{closingLine}</div>:null}
   <Img src={staticFile(logoAssets.production)} style={{display:"block",width:logo.closing.width,height:"auto"}}/>
   <div style={{marginTop:logo.closing.taglineGap,fontSize:typography.size.title,lineHeight:typography.lineHeight.title,fontWeight:typography.weight.bold,letterSpacing:typography.letterSpacing.headline}}>{tagline}</div>
  </div>
  <div style={{position:"absolute",left:safeZones.left,bottom:safeZones.bottom,width:`${line*520}px`,height:16,background:colors.orange}}/>
 </EditorialFrame>
};
