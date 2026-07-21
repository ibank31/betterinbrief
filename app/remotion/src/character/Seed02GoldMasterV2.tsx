import React from "react";
import {AbsoluteFill, Img, interpolate, interpolateColors, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";

const C={orange:"#FE5001",ink:"#151515",paper:"#F5F2ED",muted:"#AAA59E",white:"#FFFFFF"};
const clamp={extrapolateLeft:"clamp" as const,extrapolateRight:"clamp" as const};
const inOut=(f:number,a:number,b:number,c:number,d:number)=>interpolate(f,[a,b,c,d],[0,1,1,0],clamp);
const enter=(f:number,a:number,d=18)=>interpolate(f,[a,a+d],[0,1],clamp);
const CHARACTER="brand/character/sprites-v1/anchor/three-quarter-identity.png";
const Font='Arial, "Liberation Sans", sans-serif';
const Serif='Georgia, "Times New Roman", serif';

const Header:React.FC<{dark:boolean}>=({dark})=><>
 <div style={{position:"absolute",left:72,top:92,fontFamily:Font,fontSize:20,fontWeight:800,letterSpacing:3.5,color:dark?C.muted:"#69645E"}}>BETTER IN BRIEF · AI AT WORK</div>
 <div style={{position:"absolute",left:72,right:150,top:128,height:4,background:C.orange}}/>
</>;
const Analyst:React.FC<{x:number;y:number;width:number;opacity:number;scale?:number}>=({x,y,width,opacity,scale=1})=><Img src={staticFile(CHARACTER)} style={{position:"absolute",left:x,top:y,width,opacity,transform:`scale(${scale})`,transformOrigin:"50% 100%"}}/>;
const Caption:React.FC<{text:string;accent:string;opacity:number;dark:boolean}>=({text,accent,opacity,dark})=><div style={{position:"absolute",left:72,bottom:468,width:790,fontFamily:Font,fontSize:34,lineHeight:1.13,fontWeight:800,color:dark?C.paper:C.ink,opacity}}>{text.split(accent).map((p,i)=><React.Fragment key={i}>{i>0&&<span style={{color:C.orange}}>{accent}</span>}{p}</React.Fragment>)}</div>;
const Source:React.FC<{opacity:number;dark:boolean}>=({opacity,dark})=><div style={{position:"absolute",left:72,bottom:406,fontFamily:Font,fontSize:19,fontWeight:700,letterSpacing:1.4,color:dark?C.muted:"#6A655F",opacity}}>SOURCE · MICROSOFT WORK TREND INDEX 2026 · ASSOCIATION, NOT CAUSATION</div>;

export const Seed02GoldMasterV2:React.FC=()=>{
 const f=useCurrentFrame(); const {fps}=useVideoConfig();
 const bg=interpolateColors(f,[0,170,320,450,600],[C.ink,C.ink,"#211D1A",C.orange,C.paper]);
 const dark=f<520;
 const hook=inOut(f,0,8,78,112), journey=inOut(f,68,94,190,220), proof=inOut(f,180,205,315,345), blocks=inOut(f,305,330,445,475), resolve=inOut(f,430,455,555,585), close=enter(f,548,25);
 const impact=spring({frame:f-455,fps,config:{damping:24,stiffness:145,mass:.9}});
 const cameraX=interpolate(f,[0,95,205,335,455,600],[0,-18,14,-12,8,0],clamp);
 return <AbsoluteFill style={{backgroundColor:bg,overflow:"hidden",color:dark?C.paper:C.ink}}>
  <div style={{position:"absolute",inset:-60,transform:`translateX(${cameraX}px)`,backgroundImage:`linear-gradient(${dark?C.white:C.ink} 0 1px,transparent 1px),linear-gradient(90deg,${dark?C.white:C.ink} 0 1px,transparent 1px)`,backgroundSize:"72px 72px",opacity:.018}}/>
  <Header dark={dark}/>

  {/* Persistent story line: skill moves until the organization blocks it. */}
  <div style={{position:"absolute",left:72,top:1035,width:interpolate(f,[0,150,450,560],[0,720,860,936],clamp),height:8,background:C.orange,borderRadius:8}}/>
  <div style={{position:"absolute",left:interpolate(f,[18,95,150,455],[72,420,610,850],clamp),top:1006,width:54,height:54,borderRadius:30,background:dark?C.paper:C.ink,border:`8px solid ${C.orange}`}}/>

  {/* Hook: the expected answer is visibly interrupted. */}
  <div style={{position:"absolute",left:72,top:210,width:870,opacity:hook,transform:`translateY(${interpolate(enter(f,0),[0,1],[38,0])}px)`}}>
   <div style={{fontFamily:Font,fontSize:104,fontWeight:900,lineHeight:.88,letterSpacing:-5}}>YOUR AI<br/><span style={{color:C.orange}}>SKILLS</span></div>
   <div style={{marginTop:28,fontFamily:Serif,fontSize:55,lineHeight:1.02}}>may be solving the<br/><span style={{fontStyle:"italic"}}>wrong bottleneck.</span></div>
   <div style={{marginTop:52,width:interpolate(f,[24,48],[0,660],clamp),height:10,background:C.orange}}/>
  </div>
  <Analyst x={630} y={735} width={390} opacity={hook*.98} scale={interpolate(f,[0,90],[.97,1.02],clamp)}/>
  <Caption text="Your AI training may be solving the wrong problem." accent="wrong problem" opacity={hook} dark={true}/>

  {/* Journey: a shared AI-skill token travels, then hits the workflow wall. */}
  <div style={{position:"absolute",inset:0,opacity:journey}}>
   <div style={{position:"absolute",left:72,top:220,fontFamily:Font,fontSize:25,fontWeight:900,letterSpacing:3,color:C.orange}}>THE TRANSFORMATION PARADOX</div>
   <div style={{position:"absolute",left:72,top:280,fontFamily:Font,fontSize:66,fontWeight:900,lineHeight:.93,letterSpacing:-2}}>THE WORKER<br/>MOVED.</div>
   <div style={{position:"absolute",left:interpolate(f,[92,132],[84,520],clamp),top:710,padding:"18px 26px",borderRadius:50,background:C.paper,color:C.ink,fontFamily:Font,fontSize:28,fontWeight:900,boxShadow:"0 12px 34px rgba(0,0,0,.22)"}}>AI SKILLS ↑</div>
   <div style={{position:"absolute",left:640,top:470,width:96,height:560,background:C.orange,transform:`scaleY(${enter(f,120,12)})`,transformOrigin:"50% 100%"}}/>
   <div style={{position:"absolute",left:755,top:620,fontFamily:Font,fontSize:28,fontWeight:900,letterSpacing:2,writingMode:"vertical-rl"}}>OLD WORKFLOW</div>
   <div style={{position:"absolute",left:72,top:1110,fontFamily:Serif,fontSize:52,lineHeight:1.04}}>The company<br/><span style={{color:C.orange}}>didn’t.</span></div>
  </div>
  <Caption text="Workers can move faster than the systems around them." accent="systems" opacity={journey} dark={true}/>

  {/* Proof: the wall becomes the measured 67/32 comparison. */}
  <div style={{position:"absolute",inset:0,opacity:proof}}>
   <div style={{position:"absolute",left:72,top:205,fontFamily:Font,fontSize:25,fontWeight:900,letterSpacing:3,color:C.orange}}>WHAT THE DATA SHOWS</div>
   <div style={{position:"absolute",left:72,top:275,fontFamily:Serif,fontSize:205,fontWeight:700,lineHeight:.78,color:C.orange}}>67%</div>
   <div style={{position:"absolute",left:73,top:475,fontFamily:Font,fontSize:30,fontWeight:900,letterSpacing:1.5}}>ORGANIZATIONAL FACTORS</div>
   <div style={{position:"absolute",left:72,top:575,width:interpolate(f,[205,250],[0,720],clamp),height:78,background:C.orange}}/>
   <div style={{position:"absolute",left:72,top:680,width:interpolate(f,[230,275],[0,344],clamp),height:78,background:C.paper}}/>
   <div style={{position:"absolute",left:440,top:697,fontFamily:Font,fontSize:38,fontWeight:900}}>32% <span style={{fontSize:23,color:C.muted}}>INDIVIDUAL</span></div>
   <div style={{position:"absolute",left:72,top:835,fontFamily:Serif,fontSize:49,lineHeight:1.05}}>The bigger constraint<br/>was around the worker.</div>
  </div>
  <Caption text="Organizational factors were linked to 67% of reported AI impact." accent="67%" opacity={proof} dark={true}/>
  <Source opacity={proof} dark={true}/>

  {/* Breakdown: semantic blockers land on the same track, not decorative cards. */}
  <div style={{position:"absolute",inset:0,opacity:blocks}}>
   <div style={{position:"absolute",left:72,top:205,fontFamily:Font,fontSize:25,fontWeight:900,letterSpacing:3,color:C.orange}}>WHERE VALUE STALLS</div>
   <div style={{position:"absolute",left:72,top:270,fontFamily:Font,fontSize:70,fontWeight:900,lineHeight:.92,letterSpacing:-3}}>NEW TOOL.<br/><span style={{color:C.orange}}>OLD SYSTEM.</span></div>
   {["CULTURE","MANAGER SUPPORT","INCENTIVES","OLD TARGETS"].map((t,i)=>{const p=spring({frame:f-(325+i*22),fps,config:{damping:23,stiffness:180,mass:.8}});return <div key={t} style={{position:"absolute",left:72+i%2*420,top:600+Math.floor(i/2)*180,width:365,padding:"26px 24px",borderTop:`5px solid ${i===3?C.orange:C.paper}`,fontFamily:Font,fontSize:30,fontWeight:900,transform:`translateY(${interpolate(p,[0,1],[90,0])}px)`,opacity:p}}><span style={{fontFamily:Serif,color:C.orange,marginRight:18}}>0{i+1}</span>{t}</div>})}
   <Analyst x={650} y={885} width={320} opacity={enter(f,380,18)}/>
  </div>
  <Caption text="New tools cannot compound inside unchanged systems." accent="unchanged systems" opacity={blocks} dark={true}/>

  {/* Resolution: the objects become an operating equation. */}
  <div style={{position:"absolute",inset:0,opacity:resolve,color:C.ink}}>
   <div style={{position:"absolute",left:72,top:205,fontFamily:Font,fontSize:25,fontWeight:900,letterSpacing:3}}>A BETTER OPERATING MODEL</div>
   <div style={{position:"absolute",left:72,top:300,fontFamily:Font,fontSize:94,fontWeight:900,lineHeight:.9,letterSpacing:-5}}>SKILL</div>
   <div style={{position:"absolute",left:72,top:430,fontFamily:Serif,fontSize:92}}>×</div>
   <div style={{position:"absolute",left:155,top:445,fontFamily:Font,fontSize:94,fontWeight:900,lineHeight:.9,letterSpacing:-5}}>SYSTEM</div>
   <div style={{position:"absolute",left:72,top:585,width:interpolate(impact,[0,1],[80,760]),height:16,background:C.ink}}/>
   <div style={{position:"absolute",left:72,top:650,fontFamily:Serif,fontSize:67,lineHeight:1}}>creates<br/><span style={{fontFamily:Font,fontWeight:900}}>AI IMPACT.</span></div>
   <div style={{position:"absolute",left:72,top:890,fontFamily:Font,fontSize:29,fontWeight:800,maxWidth:570}}>If either side is weak, the value stalls.</div>
   <Analyst x={650} y={780} width={350} opacity={enter(f,470,20)}/>
  </div>
  <Caption text="Don't just train people. Redesign the system." accent="Redesign the system" opacity={resolve} dark={false}/>

  {/* Close is a payoff on the same equation, not a detached end card. */}
  <div style={{position:"absolute",inset:0,opacity:close,color:C.ink,background:C.paper}}>
   <Header dark={false}/>
   <div style={{position:"absolute",left:72,top:260,width:870,fontFamily:Font,fontSize:79,fontWeight:900,lineHeight:.91,letterSpacing:-4}}>THE WORKER<br/>IS READY.<br/><span style={{color:C.orange}}>IS THE COMPANY?</span></div>
   <div style={{position:"absolute",left:72,top:660,width:760,height:12,background:C.orange}}/>
   <div style={{position:"absolute",left:72,top:730,fontFamily:Serif,fontSize:47,lineHeight:1.05}}>Save this for your<br/>next AI strategy review.</div>
   <Analyst x={650} y={790} width={365} opacity={close}/>
   <div style={{position:"absolute",left:72,bottom:470,fontFamily:Font,fontSize:25,fontWeight:900,letterSpacing:3}}>BIG IDEAS. BRIEFLY.</div>
  </div>
 </AbsoluteFill>;
};
