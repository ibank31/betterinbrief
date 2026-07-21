import React from "react";
import {Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import type {AnalystExpression, AnalystGesture} from "./character-sprite-types";

const clamp = {extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const};
const ROOT = "brand/character/sprites-v1";

export const analystSpritePaths = {
  anchor: `${ROOT}/anchor/three-quarter-identity.png`,
  expression: (name: AnalystExpression) => `${ROOT}/expressions/${name}.png`,
  gesture: (name: AnalystGesture) => `${ROOT}/gestures/${name}.png`,
} as const;

type BaseProps = {startFrame?: number; width?: number; side?: "left" | "right"};

export const AnalystAnchor: React.FC<BaseProps> = ({startFrame = 0, width = 620, side = "right"}) => {
  const frame = useCurrentFrame() - startFrame;
  const {fps} = useVideoConfig();
  const progress = spring({frame: Math.max(0, frame), fps, config: {damping: 28, stiffness: 125, mass: 0.9}, durationInFrames: 24});
  const opacity = interpolate(frame, [0, 10], [0, 1], clamp);
  const lift = interpolate(progress, [0, 1], [28, 0]);
  const push = interpolate(Math.max(0, frame), [0, 120], [0.985, 1.025], clamp);
  const idleY = Math.sin(Math.max(0, frame) / 20) * 2.2;
  const flip = side === "left" ? -1 : 1;
  return <Img src={staticFile(analystSpritePaths.anchor)} style={{width, height: "auto", display: "block", opacity, transform: `translateY(${lift + idleY}px) scale(${push}) scaleX(${flip})`, transformOrigin: "50% 100%"}} />;
};

export const AnalystExpressionSprite: React.FC<BaseProps & {expression: AnalystExpression}> = ({expression, startFrame = 0, width = 430, side = "right"}) => {
  const frame = useCurrentFrame() - startFrame;
  const opacity = interpolate(frame, [0, 5, 32, 38], [0, 1, 1, 0], clamp);
  const scale = interpolate(frame, [0, 38], [1, 1.035], clamp);
  const flip = side === "left" ? -1 : 1;
  return <Img src={staticFile(analystSpritePaths.expression(expression))} style={{width, height: "auto", display: "block", opacity, transform: `scale(${scale}) scaleX(${flip})`}} />;
};

export const AnalystGestureSprite: React.FC<BaseProps & {gesture: AnalystGesture}> = ({gesture, startFrame = 0, width = 430, side = "right"}) => {
  const frame = useCurrentFrame() - startFrame;
  const opacity = interpolate(frame, [0, 5, 32, 38], [0, 1, 1, 0], clamp);
  const x = interpolate(frame, [0, 12], [18, 0], clamp);
  const flip = side === "left" ? -1 : 1;
  return <Img src={staticFile(analystSpritePaths.gesture(gesture))} style={{width, height: "auto", display: "block", opacity, transform: `translateX(${x}px) scaleX(${flip})`}} />;
};
