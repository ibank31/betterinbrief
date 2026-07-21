import React from "react";
import {interpolate, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {colors, motion} from "../brand/tokens";
import type {NarrativeDeviceKind, SceneSurface} from "../episodes/types";

const inkFor = (surface: SceneSurface) => surface === "dark"
  ? "rgba(255,255,255,0.34)"
  : "rgba(0,0,0,0.26)";

const softFor = (surface: SceneSurface) => surface === "dark"
  ? "rgba(255,255,255,0.08)"
  : "rgba(0,0,0,0.06)";

const Card: React.FC<{x: number; y: number; rotate: number; accent?: boolean; opacity?: number}> = ({x, y, rotate, accent = false, opacity = 1}) => (
  <div style={{
    position: "absolute", left: x, top: y, width: 152, height: 100,
    border: `3px solid ${accent ? colors.orange : "currentColor"}`,
    background: accent ? colors.orange16 : "transparent",
    transform: `rotate(${rotate}deg)`, opacity,
  }}>
    <div style={{position: "absolute", left: 16, top: 20, width: 82, height: 7, background: "currentColor", opacity: 0.72}} />
    <div style={{position: "absolute", left: 16, top: 43, width: 106, height: 7, background: "currentColor", opacity: 0.35}} />
    <div style={{position: "absolute", left: 16, top: 66, width: 56, height: 7, background: accent ? colors.orange : "currentColor", opacity: 0.72}} />
  </div>
);

const TwoTracks: React.FC<{surface: SceneSurface}> = ({surface}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - 5, fps, config: motion.spring.editorial});
  const drift = interpolate(frame, [0, 150], [0, 1], {extrapolateRight: "clamp"});
  const ink = inkFor(surface);
  return <div style={{position: "absolute", right: 34, top: 510, width: 520, height: 470, color: ink, opacity: 0.94, transform: `translateX(${(1 - p) * 85}px)`}}>
    <div style={{position: "absolute", left: 18, top: 30, width: 220, height: 8, background: ink, transform: "rotate(-24deg)", transformOrigin: "left"}} />
    <div style={{position: "absolute", left: 240, top: 180, width: 235, height: 8, background: colors.orange, transform: "rotate(24deg)", transformOrigin: "left"}} />
    {[0, 1, 2].map((index) => <Card key={index} x={50 + index * 42 + drift * 16} y={75 + index * 52} rotate={-12} opacity={0.35 + index * 0.18} />)}
    {[0, 1, 2].map((index) => <div key={index} style={{position: "absolute", left: 282 + (index === 1 ? 125 : 0), top: 202 + index * 78, width: 38, height: 38, borderRadius: "50%", background: index === 2 ? colors.orange : ink, transform: `scale(${0.75 + p * 0.25})`}} />)}
    <svg width="520" height="470" viewBox="0 0 520 470" style={{position: "absolute", inset: 0}}>
      <path d="M 300 222 C 380 245, 392 288, 450 290 M 300 222 C 355 300, 330 365, 365 385" fill="none" stroke={colors.orange} strokeWidth="5" strokeDasharray="12 13" opacity="0.8" />
    </svg>
  </div>;
};

const EvidenceScan: React.FC<{surface: SceneSurface}> = ({surface}) => {
  const frame = useCurrentFrame();
  const ink = inkFor(surface);
  const soft = softFor(surface);
  const scan = interpolate(frame, [8, 60], [0, 1], {extrapolateRight: "clamp"});
  return <div style={{position: "absolute", right: 44, bottom: 300, width: 430, height: 530, color: ink, opacity: 0.9}}>
    <div style={{position: "absolute", inset: 0, border: `3px solid ${ink}`, background: soft, transform: "rotate(4deg)"}} />
    {[0, 1, 2, 3, 4].map((index) => <div key={index} style={{position: "absolute", left: 55, top: 80 + index * 58, width: index === 2 ? 260 : 315 - index * 22, height: 10, background: index === 2 ? colors.orange : ink, opacity: index === 2 ? 0.86 : 0.5}} />)}
    <div style={{position: "absolute", left: 32, right: 32, top: 55 + scan * 325, height: 8, background: colors.orange, boxShadow: `0 0 0 8px ${colors.orange16}`}} />
    <div style={{position: "absolute", right: 34, top: 40, width: 106, height: 106, border: `6px solid ${colors.orange}`, borderRadius: "50%"}} />
    <div style={{position: "absolute", right: 11, top: 135, width: 62, height: 7, background: colors.orange, transform: "rotate(45deg)"}} />
  </div>;
};

const DecisionGraph: React.FC<{surface: SceneSurface}> = ({surface}) => {
  const frame = useCurrentFrame();
  const ink = inkFor(surface);
  const pop = interpolate(frame, [4, 45], [0, 1], {extrapolateRight: "clamp"});
  const nodes = [{x: 0, y: 170, s: 54}, {x: 170, y: 82, s: 64}, {x: 190, y: 280, s: 48}, {x: 355, y: 42, s: 84}, {x: 365, y: 315, s: 68}];
  return <div style={{position: "absolute", right: 22, top: 660, width: 530, height: 520, color: ink, opacity: 0.78}}>
    <svg width="530" height="520" viewBox="0 0 530 520" style={{position: "absolute", inset: 0}}>
      <path d="M 30 195 L 190 115 L 390 82 M 30 195 L 210 302 L 397 348" fill="none" stroke={ink} strokeWidth="4" strokeDasharray="10 12" />
    </svg>
    {nodes.map((node, index) => <div key={index} style={{position: "absolute", left: node.x, top: node.y, width: node.s, height: node.s, borderRadius: "50%", border: `5px solid ${index > 2 ? colors.orange : ink}`, background: index === 4 ? colors.orange16 : "transparent", transform: `scale(${0.6 + pop * 0.4})`, transformOrigin: "center"}} />)}
  </div>;
};

const TaskSystem: React.FC<{surface: SceneSurface}> = ({surface}) => {
  const frame = useCurrentFrame();
  const ink = inkFor(surface);
  const p = interpolate(frame, [5, 45], [0, 1], {extrapolateRight: "clamp"});
  return <div style={{position: "absolute", right: 22, top: 535, width: 360, height: 720, color: ink, opacity: 0.84}}>
    {[0, 1, 2, 3].map((index) => <div key={index} style={{position: "absolute", right: index % 2 ? 38 : 0, top: index * 152, width: 230 - index * 17, height: 92, border: `3px solid ${index < 2 ? colors.orange : ink}`, transform: `translateX(${(1 - p) * (index % 2 ? 58 : -58)}px)`, background: index === 0 ? colors.orange16 : "transparent"}} />)}
    <div style={{position: "absolute", left: 135, top: 78, height: 505, width: 5, background: ink, opacity: 0.5}} />
  </div>;
};

const PrioritySignal: React.FC<{surface: SceneSurface}> = ({surface}) => {
  const frame = useCurrentFrame();
  const ink = inkFor(surface);
  const rise = interpolate(frame, [4, 45], [0, 1], {extrapolateRight: "clamp"});
  return <div style={{position: "absolute", right: 46, bottom: 250, width: 400, height: 500, color: ink, opacity: 0.86}}>
    {[0, 1, 2].map((index) => <div key={index} style={{position: "absolute", left: 45 + index * 105, bottom: 34, width: 56, height: (130 + index * 100) * rise, background: index === 2 ? colors.white : ink, border: index === 2 ? `4px solid ${colors.black}` : "none"}} />)}
    <div style={{position: "absolute", left: 42, top: 25, width: 305, height: 5, background: colors.black, transform: "rotate(-35deg)", transformOrigin: "left"}} />
    <div style={{position: "absolute", right: 38, top: 0, width: 32, height: 32, background: colors.white, transform: "rotate(45deg)"}} />
  </div>;
};

export const NarrativeDevice: React.FC<{kind: NarrativeDeviceKind; surface: SceneSurface}> = ({kind, surface}) => {
  switch (kind) {
    case "two_tracks": return <TwoTracks surface={surface} />;
    case "evidence_scan": return <EvidenceScan surface={surface} />;
    case "decision_graph": return <DecisionGraph surface={surface} />;
    case "task_system": return <TaskSystem surface={surface} />;
    case "priority_signal": return <PrioritySignal surface={surface} />;
  }
};
