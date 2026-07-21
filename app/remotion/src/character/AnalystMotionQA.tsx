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

const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

const ASSET = "brand/character/sprites-v1/anchor/three-quarter-identity.png";

type SceneProps = {
  background: string;
  foreground: string;
  accent: string;
  eyebrow: string;
  title: string;
  note: string;
  side: "left" | "right" | "center";
};

const MotionScene: React.FC<SceneProps> = ({
  background,
  foreground,
  accent,
  eyebrow,
  title,
  note,
  side,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({
    frame,
    fps,
    config: {damping: 28, stiffness: 115, mass: 0.9},
    durationInFrames: 26,
  });
  const opacity = interpolate(frame, [0, 10, 108, 119], [0, 1, 1, 0], clamp);
  const lift = interpolate(enter, [0, 1], [34, 0]);
  const scale = interpolate(frame, [0, 119], [0.97, 1.035], clamp);
  const idleY = Math.sin(frame / 18) * 2;
  const left = side === "left" ? 36 : side === "center" ? 160 : 285;

  return (
    <AbsoluteFill style={{backgroundColor: background, color: foreground, fontFamily: "Arial, sans-serif", overflow: "hidden"}}>
      <div style={{position: "absolute", left: 72, right: 72, top: 100, zIndex: 2}}>
        <div style={{fontSize: 23, fontWeight: 800, letterSpacing: 4, opacity: 0.68}}>BETTER IN BRIEF · THE ANALYST</div>
        <div style={{marginTop: 26, fontSize: 88, lineHeight: 0.94, fontWeight: 900, letterSpacing: -3, whiteSpace: "pre-line"}}>{title}</div>
        <div style={{marginTop: 24, fontSize: 31, fontWeight: 900, letterSpacing: 2, color: accent}}>{eyebrow}</div>
      </div>

      <div style={{position: "absolute", left, bottom: 245, opacity, transform: `translateY(${lift + idleY}px) scale(${scale})`, transformOrigin: "50% 100%"}}>
        <Img src={staticFile(ASSET)} style={{width: 760, height: "auto", display: "block"}} />
      </div>

      <div style={{position: "absolute", left: 72, right: 72, bottom: 88, paddingTop: 24, borderTop: `4px solid ${accent}`, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 24, fontWeight: 800}}>
        <span>{note}</span>
        <span>ORIGINAL PIXELS · SAFE MOTION</span>
      </div>
    </AbsoluteFill>
  );
};

export const AnalystMotionQA: React.FC = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={120}>
        <MotionScene background="#000000" foreground="#FFFFFF" accent="#FE5001" eyebrow="01 · OBSERVE" title="A CALM\nENTRANCE" note="Fade · lift · controlled push-in" side="right" />
      </Sequence>
      <Sequence from={120} durationInFrames={120}>
        <MotionScene background="#FE5001" foreground="#000000" accent="#000000" eyebrow="02 · CONNECT" title="FIND THE\nPATTERN" note="Editorial cut · no deformation" side="left" />
      </Sequence>
      <Sequence from={240} durationInFrames={120}>
        <MotionScene background="#165DFF" foreground="#FFFFFF" accent="#FE5001" eyebrow="03 · DELIVER" title="BETTER IN\nBRIEF" note="Slow scale · deterministic timing" side="center" />
      </Sequence>
    </AbsoluteFill>
  );
};
