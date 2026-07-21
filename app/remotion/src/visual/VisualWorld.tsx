import React from "react";
import {AbsoluteFill, interpolate, random, useCurrentFrame} from "remotion";
import {colors} from "../brand/tokens";
import type {SceneSurface, VisualDensity, VisualLane, VisualWorldSpec} from "../episodes/types";

const laneDefaults: Record<VisualLane, {density: VisualDensity; material: "paper" | "scan" | "grid" | "grain" | "halftone"}> = {
  editorial_collage: {density: "editorial", material: "paper"},
  evidence_desk: {density: "editorial", material: "scan"},
  diagram_world: {density: "editorial", material: "grid"},
  object_metaphor: {density: "quiet", material: "grain"},
  interface_reality: {density: "editorial", material: "grid"},
  cinematic_context: {density: "quiet", material: "grain"},
  data_theatre: {density: "dense", material: "halftone"},
  editorial_type: {density: "quiet", material: "paper"},
};

export const defaultVisualWorld = (
  sceneId: string,
  surface: SceneSurface,
  type: string,
): VisualWorldSpec => {
  const laneByType: Record<string, VisualLane> = {
    hook: "object_metaphor",
    correction: "editorial_collage",
    data_proof: "evidence_desk",
    task_breakdown: "diagram_world",
    comparison: "diagram_world",
    outcome: "editorial_type",
    closing_brand: "editorial_type",
  };
  const lane = laneByType[type] ?? "editorial_collage";
  return {
    lane,
    density: laneDefaults[lane].density,
    seed: sceneId,
    material: laneDefaults[lane].material,
  };
};

const paletteFor = (surface: SceneSurface) => {
  if (surface === "dark") {
    return {base: colors.black, ink: "rgba(255,255,255,0.13)", faint: "rgba(255,255,255,0.055)", accent: colors.orange};
  }
  if (surface === "orange") {
    return {base: colors.orange, ink: "rgba(0,0,0,0.16)", faint: "rgba(0,0,0,0.06)", accent: colors.white};
  }
  return {base: colors.warmWhite, ink: "rgba(0,0,0,0.13)", faint: "rgba(0,0,0,0.055)", accent: colors.orange};
};

const MaterialLayer: React.FC<{material: VisualWorldSpec["material"]; ink: string; faint: string}> = ({material, ink, faint}) => {
  const backgroundImage = material === "grid"
    ? `linear-gradient(${faint} 1px, transparent 1px), linear-gradient(90deg, ${faint} 1px, transparent 1px)`
    : material === "halftone"
      ? `radial-gradient(${ink} 1.3px, transparent 1.6px)`
      : material === "scan"
        ? `repeating-linear-gradient(0deg, transparent 0px, transparent 10px, ${faint} 11px, transparent 12px)`
        : material === "paper"
          ? `repeating-linear-gradient(8deg, transparent 0px, transparent 4px, ${faint} 5px, transparent 7px)`
          : `repeating-radial-gradient(circle at 27% 31%, ${faint} 0px, transparent 1px, transparent 4px)`;
  const backgroundSize = material === "grid" ? "72px 72px" : material === "halftone" ? "16px 16px" : "auto";
  return <AbsoluteFill style={{backgroundImage, backgroundSize, opacity: material === "halftone" ? 0.65 : 0.9, pointerEvents: "none"}} />;
};

const EvidenceMarks: React.FC<{seed: string; ink: string; accent: string; density: VisualDensity}> = ({seed, ink, accent, density}) => {
  const frame = useCurrentFrame();
  const movement = interpolate(frame, [0, 120], [0, 1], {extrapolateRight: "clamp"});
  const count = density === "dense" ? 7 : density === "editorial" ? 5 : 3;
  return <>
    {Array.from({length: count}).map((_, index) => {
      const x = random(`${seed}-x-${index}`) * 1000 - 110;
      const y = random(`${seed}-y-${index}`) * 1700 + 80;
      const w = 150 + random(`${seed}-w-${index}`) * 270;
      const h = 90 + random(`${seed}-h-${index}`) * 170;
      const rotate = -16 + random(`${seed}-r-${index}`) * 32;
      const drift = (random(`${seed}-d-${index}`) - 0.5) * 26 * movement;
      return <div key={index} style={{position: "absolute", left: x, top: y, width: w, height: h, border: `2px solid ${ink}`, background: "rgba(255,255,255,0.015)", transform: `rotate(${rotate}deg) translate(${drift}px, ${-drift}px)`, opacity: 0.72}} />;
    })}
    <div style={{position: "absolute", right: 72, top: 215, width: 220, height: 7, background: accent, opacity: 0.55, transform: `scaleX(${0.55 + movement * 0.45})`, transformOrigin: "right"}} />
    <div style={{position: "absolute", left: 64, bottom: 285, width: 155, height: 155, border: `5px solid ${ink}`, borderRadius: "50%", opacity: 0.48}} />
  </>;
};

const DiagramMarks: React.FC<{seed: string; ink: string; accent: string}> = ({seed, ink, accent}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, 80], [0, 1], {extrapolateRight: "clamp"});
  const nodes = [
    {x: 770, y: 375, s: 96}, {x: 900, y: 535, s: 54}, {x: 715, y: 690, s: 68}, {x: 900, y: 850, s: 112},
  ];
  return <>
    <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{position: "absolute", inset: 0, opacity: 0.62}}>
      <path d="M 760 425 C 860 470, 820 560, 920 590 S 740 735, 760 730 S 890 850, 930 900" fill="none" stroke={ink} strokeWidth="4" strokeDasharray="14 16" />
    </svg>
    {nodes.map((node, index) => <div key={index} style={{position: "absolute", left: node.x, top: node.y, width: node.s, height: node.s, borderRadius: "50%", border: `4px solid ${index === 3 ? accent : ink}`, transform: `scale(${0.5 + p * 0.5})`, opacity: 0.45 + p * 0.3}} />)}
    <div style={{position: "absolute", right: 44, bottom: 325, width: 360, height: 96, borderTop: `2px solid ${ink}`, borderBottom: `2px solid ${ink}`, opacity: 0.45}} />
  </>;
};

const InterfaceMarks: React.FC<{seed: string; ink: string; accent: string}> = ({seed, ink, accent}) => {
  const frame = useCurrentFrame();
  const scan = (frame % 150) / 150;
  return <>
    {[0, 1, 2].map((index) => <div key={index} style={{position: "absolute", right: 40 + index * 40, top: 280 + index * 155, width: 330, height: 118, border: `2px solid ${ink}`, opacity: 0.38, transform: `translateX(${index % 2 ? 20 : 0}px)`}} />)}
    <div style={{position: "absolute", right: 80, top: 350 + scan * 750, width: 310, height: 4, background: accent, opacity: 0.5}} />
    <div style={{position: "absolute", left: 74, bottom: 305, fontSize: 20, letterSpacing: 4, color: ink, fontWeight: 800}}>SIGNAL / {seed.toUpperCase()}</div>
  </>;
};

export const EditorialWorld: React.FC<{world: VisualWorldSpec; surface: SceneSurface}> = ({world, surface}) => {
  const resolved = {...laneDefaults[world.lane], ...world};
  const palette = paletteFor(surface);
  return <AbsoluteFill style={{backgroundColor: palette.base, overflow: "hidden"}}>
    <MaterialLayer material={resolved.material} ink={palette.ink} faint={palette.faint} />
    <AbsoluteFill style={{background: surface === "dark" ? "radial-gradient(circle at 92% 24%, rgba(254,80,1,0.13), transparent 30%), linear-gradient(145deg, rgba(255,255,255,0.035), transparent 42%)" : surface === "orange" ? "linear-gradient(135deg, rgba(255,255,255,0.16), transparent 42%), radial-gradient(circle at 80% 18%, rgba(0,0,0,0.12), transparent 32%)" : "radial-gradient(circle at 92% 20%, rgba(254,80,1,0.10), transparent 28%), linear-gradient(145deg, rgba(0,0,0,0.025), transparent 45%)"}} />
    {resolved.lane === "diagram_world" || resolved.lane === "data_theatre" ? <DiagramMarks seed={resolved.seed} ink={palette.ink} accent={palette.accent} /> : null}
    {resolved.lane === "interface_reality" ? <InterfaceMarks seed={resolved.seed} ink={palette.ink} accent={palette.accent} /> : null}
    {resolved.lane === "editorial_collage" || resolved.lane === "evidence_desk" || resolved.lane === "cinematic_context" ? <EvidenceMarks seed={resolved.seed} ink={palette.ink} accent={palette.accent} density={resolved.density} /> : null}
    {resolved.lane === "object_metaphor" || resolved.lane === "editorial_type" ? <EvidenceMarks seed={resolved.seed} ink={palette.ink} accent={palette.accent} density="quiet" /> : null}
    <AbsoluteFill style={{background: "linear-gradient(90deg, rgba(0,0,0,0.12), transparent 28%, transparent 70%, rgba(0,0,0,0.07))", mixBlendMode: surface === "light" ? "multiply" : "normal", opacity: 0.45}} />
  </AbsoluteFill>;
};
