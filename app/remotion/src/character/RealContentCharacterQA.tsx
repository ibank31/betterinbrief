import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const clamp={extrapolateLeft:"clamp" as const,extrapolateRight:"clamp" as const};
const CHARACTER="brand/character/sprites-v1/anchor/three-quarter-identity.png";

type Kind="hero"|"correction"|"metric"|"list"|"comparison"|"formula"|"closing";
type Scene={kind:Kind;kicker:string;headline:string;primary?:string;secondary?:string;caption:string;items?:string[];surface:"dark"|"light"|"orange"};

const seed01:Scene[]=[
 {kind:"hero",surface:"dark",kicker:"AI · TECHNOLOGY · WORK",primary:"1 IN 4",headline:"WORKERS MAY SEE\nTHEIR WORK RESHAPED",caption:"AI could affect one in four workers worldwide."},
 {kind:"correction",surface:"light",kicker:"THE HEADLINE GETS THIS WRONG",primary:"EXPOSURE",secondary:"JOB LOSS",headline:"CHANGE IS NOT\nTHE SAME AS DISAPPEARANCE",caption:"Exposure does not mean one in four jobs will disappear."},
 {kind:"metric",surface:"dark",kicker:"WHAT THE DATA ACTUALLY SAYS",primary:"3.3%",secondary:"HIGHEST-EXPOSURE CATEGORY",headline:"THE EXTREME CASE\nIS SMALLER THAN THE HEADLINE",caption:"Only 3.3 percent of global employment falls into the highest exposure category."},
 {kind:"list",surface:"dark",kicker:"LOOK INSIDE THE JOB",headline:"A JOB IS A\nBUNDLE OF TASKS",items:["ANALYSIS · SHIFTS","WRITING · SHIFTS","JUDGMENT · STAYS HUMAN","CONTEXT · STAYS HUMAN","TRUST · STAYS HUMAN"],caption:"Tasks move at different speeds inside the same role."},
 {kind:"comparison",surface:"light",kicker:"THE SHIFT IS UNEVEN",primary:"JOB TITLE\nSTAYS",secondary:"TASK MIX\nMOVES",headline:"THE ROLE CHANGES\nBEFORE THE TITLE DOES",caption:"The most likely outcome is job transformation—not simple job loss."},
 {kind:"formula",surface:"orange",kicker:"THE MORE LIKELY OUTCOME",primary:"TRANSFORMATION",secondary:"> JOB LOSS",headline:"CAN YOUR SKILLS\nKEEP UP?",caption:"The work underneath a familiar title can change faster than your skills."},
 {kind:"closing",surface:"light",kicker:"BETTER IN BRIEF",primary:"BINB",headline:"BIG IDEAS.\nBRIEFLY.",caption:"Follow the shift beneath the headline."},
];

const seed02:Scene[]=[
 {kind:"hero",surface:"dark",kicker:"AI · COMPANY STRATEGY",primary:"AI SKILLS",headline:"MAY NOT BE\nTHE BOTTLENECK",caption:"Your AI skills may not be the bottleneck. Your company might be."},
 {kind:"correction",surface:"light",kicker:"THE TRANSFORMATION PARADOX",primary:"TRAIN THE WORKER",secondary:"REDESIGN THE SYSTEM",headline:"THE WORKER MOVES.\nTHE SYSTEM MUST FOLLOW.",caption:"Workers are often moving faster than their organizations."},
 {kind:"metric",surface:"dark",kicker:"WHAT THE DATA SHOWS",primary:"67%",secondary:"32% INDIVIDUAL FACTORS",headline:"AI IMPACT IS MOSTLY\nORGANIZATIONAL",caption:"Organizational factors were linked to 67 percent of reported AI impact."},
 {kind:"list",surface:"dark",kicker:"WHERE TRANSFORMATION STALLS",headline:"THE WORKER CHANGES.\nTHE SYSTEM DOESN'T.",items:["CULTURE","MANAGER SUPPORT","INCENTIVES","OLD TARGETS"],caption:"New tools cannot compound inside unchanged systems."},
 {kind:"formula",surface:"orange",kicker:"A BETTER OPERATING MODEL",primary:"SKILL × SYSTEM",secondary:"= AI IMPACT",headline:"IS YOUR ORGANIZATION\nREADY?",caption:"If either skill or system readiness is weak, the value stalls."},
 {kind:"closing",surface:"light",kicker:"BETTER IN BRIEF",primary:"BINB",headline:"AI TRANSFORMATION\nIS ORGANIZATIONAL.",caption:"Big ideas. Briefly."},
];

const palette={
 dark:{bg:"#171717",fg:"#F7F4EF",muted:"#AAA7A2",accent:"#FE5001"},
 light:{bg:"#F3F0EA",fg:"#111111",muted:"#68645F",accent:"#FE5001"},
 orange:{bg:"#FE5001",fg:"#0B0B0B",muted:"#3D1709",accent:"#FFFFFF"},
};

const EditorialScene:React.FC<{scene:Scene;index:number;total:number}>=({scene,index,total})=>{
 const frame=useCurrentFrame();const {fps}=useVideoConfig();const p=spring({frame,fps,config:{damping:28,stiffness:120,mass:.9},durationInFrames:24});
 const opacity=interpolate(frame,[0,7,82,89],[0,1,1,0],clamp);const c=palette[scene.surface];
 const isData=scene.kind==="metric"||scene.kind==="list"||scene.kind==="comparison";
 const characterWidth=scene.kind==="hero"?470:isData?300:scene.kind==="closing"?330:390;
 const characterRight=scene.kind==="hero"?70:92;
 const contentWidth=scene.kind==="hero"?900:scene.kind==="closing"?660:610;
 const lift=interpolate(p,[0,1],[30,0]);
 return <AbsoluteFill style={{backgroundColor:c.bg,color:c.fg,fontFamily:"Arial, sans-serif",overflow:"hidden",opacity}}>
   <div style={{position:"absolute",inset:0,backgroundImage:`linear-gradient(${c.fg}0 1px,transparent 1px),linear-gradient(90deg,${c.fg}0 1px,transparent 1px)`,backgroundSize:"64px 64px",opacity:.025}}/>
   <div style={{position:"absolute",left:70,right:150,top:92,height:4,backgroundColor:c.accent}}/>
   <div style={{position:"absolute",left:70,top:112,fontSize:22,fontWeight:800,letterSpacing:4,color:c.muted}}>BETTER IN BRIEF · {String(index+1).padStart(2,"0")}/{String(total).padStart(2,"0")}</div>
   <main style={{position:"absolute",left:70,top:185,width:contentWidth,transform:`translateY(${lift}px)`}}>
    <div style={{fontSize:23,fontWeight:900,letterSpacing:3,color:c.accent,marginBottom:28}}>{scene.kicker}</div>
    {scene.kind==="hero"&&<><div style={{fontSize:124,fontWeight:900,letterSpacing:-6,lineHeight:.88,color:c.accent}}>{scene.primary}</div><div style={{marginTop:24,fontSize:76,fontWeight:900,letterSpacing:-3,lineHeight:.93,whiteSpace:"pre-line"}}>{scene.headline}</div></>}
    {scene.kind==="correction"&&<><div style={{fontSize:55,fontWeight:900,color:c.muted,textDecoration:"line-through",textDecorationColor:c.accent,textDecorationThickness:8}}>{scene.primary}</div><div style={{fontSize:38,color:c.accent,margin:"18px 0"}}>↓</div><div style={{fontSize:64,fontWeight:900,lineHeight:.95}}>{scene.secondary}</div><div style={{marginTop:34,fontFamily:"Georgia, serif",fontSize:44,lineHeight:1.05,whiteSpace:"pre-line"}}>{scene.headline}</div></>}
    {scene.kind==="metric"&&<><div style={{display:"flex",alignItems:"baseline",gap:24}}><div style={{fontFamily:"Georgia, serif",fontSize:176,lineHeight:.8,fontWeight:700,color:c.accent}}>{scene.primary}</div><div style={{fontSize:28,fontWeight:900,maxWidth:230}}>{scene.secondary}</div></div><div style={{marginTop:48,height:20,width:560,backgroundColor:"#3A3A3A"}}><div style={{width:scene.primary==="67%"?"67%":"33%",height:"100%",backgroundColor:c.accent}}/></div><div style={{marginTop:52,fontFamily:"Georgia, serif",fontSize:48,lineHeight:1.03,whiteSpace:"pre-line"}}>{scene.headline}</div></>}
    {scene.kind==="list"&&<><div style={{fontSize:66,fontWeight:900,lineHeight:.94,letterSpacing:-2,whiteSpace:"pre-line"}}>{scene.headline}</div><div style={{marginTop:42,display:"grid",gap:12}}>{scene.items?.map((item,i)=><div key={item} style={{display:"flex",alignItems:"center",gap:18,padding:"14px 18px",borderTop:`1px solid ${c.muted}`,fontSize:25,fontWeight:800}}><span style={{color:c.accent,fontFamily:"Georgia, serif"}}>0{i+1}</span>{item}</div>)}</div></>}
    {scene.kind==="comparison"&&<><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>{[scene.primary,scene.secondary].map((v,i)=><div key={i} style={{padding:"30px 24px",border:`3px solid ${i?c.accent:c.fg}`,fontSize:42,fontWeight:900,lineHeight:.95,whiteSpace:"pre-line",color:i?c.accent:c.fg}}>{v}</div>)}</div><div style={{marginTop:46,fontFamily:"Georgia, serif",fontSize:48,lineHeight:1.03,whiteSpace:"pre-line"}}>{scene.headline}</div></>}
    {scene.kind==="formula"&&<><div style={{fontSize:70,fontWeight:900,lineHeight:.92,color:c.fg}}>{scene.primary}</div><div style={{fontSize:60,fontWeight:900,color:c.accent,marginTop:14}}>{scene.secondary}</div><div style={{marginTop:64,paddingTop:24,borderTop:`5px solid ${c.fg}`,fontFamily:"Georgia, serif",fontSize:51,lineHeight:1.02,whiteSpace:"pre-line"}}>{scene.headline}</div></>}
    {scene.kind==="closing"&&<><div style={{fontSize:160,fontWeight:900,letterSpacing:-10,lineHeight:.8}}>{scene.primary}</div><div style={{marginTop:42,fontFamily:"Georgia, serif",fontSize:56,lineHeight:1.02,whiteSpace:"pre-line"}}>{scene.headline}</div></>}
   </main>
   <div style={{position:"absolute",right:characterRight,bottom:278,width:characterWidth,transform:`translateY(${lift}px) scale(${interpolate(frame,[0,89],[.98,1.025],clamp)})`,transformOrigin:"50% 100%"}}><Img src={staticFile(CHARACTER)} style={{width:"100%",display:"block"}}/></div>
   <div style={{position:"absolute",left:70,bottom:300,width:500,minHeight:120,padding:"22px 24px",backgroundColor:scene.surface==="light"?"#111111":"#F3F0EA",color:scene.surface==="light"?"#FFFFFF":"#111111",borderLeft:`8px solid ${c.accent}`,fontSize:27,lineHeight:1.18,fontWeight:800,boxSizing:"border-box"}}>{scene.caption}</div>
   <div style={{position:"absolute",left:70,right:150,bottom:238,height:2,backgroundColor:c.muted,opacity:.45}}/>
 </AbsoluteFill>;
};

const EpisodePilot:React.FC<{scenes:Scene[]}>=({scenes})=><AbsoluteFill>{scenes.map((scene,i)=><Sequence key={`${scene.kicker}-${i}`} from={i*90} durationInFrames={90}><EditorialScene scene={scene} index={i} total={scenes.length}/></Sequence>)}</AbsoluteFill>;
export const Seed01CharacterContentQA:React.FC=()=> <EpisodePilot scenes={seed01}/>;
export const Seed02CharacterContentQA:React.FC=()=> <EpisodePilot scenes={seed02}/>;
