import React from "react";
import {interpolate, random, spring, useCurrentFrame, useVideoConfig} from "remotion";
import {colors, motion} from "../brand/tokens";
import type {NarrativeDeviceKind, SceneSurface} from "../episodes/types";

// v1.3b — device parametrik & jujur-data.
// - `seed` (episodeId-sceneId) menggerakkan seluruh geometri: tidak ada dua
//   scene/episode dengan komposisi device yang identik.
// - `data` hanya berisi angka asli dari klaim scene. Batang/sumbu/proporsi
//   HANYA digambar bila data nyata tersedia; tanpa data, device merender
//   metafora non-kuantitatif (tanpa chart palsu yang menyiratkan data).
// - Device tetap bebas teks: teks hanya hidup di layer konten scene.
// v1.3c — semua entrance memakai fisika spring() dengan stagger per elemen
//   (best practice resmi Remotion): kartu/node/batang/baris lahir bertahap
//   dengan overshoot halus, bukan muncul serentak dalam satu tween linear.

export type DeviceData = {
  /** Angka asli dari klaim scene (mis. [62] atau [34, 100]). */
  values?: number[] | undefined;
  /** Skala penuh opsional (mis. 100 untuk persen). */
  max?: number | undefined;
  /** Index nilai hero. Default: nilai terakhir. */
  highlightIndex?: number | undefined;
};

export type NarrativeDeviceProps = {
  kind: NarrativeDeviceKind;
  surface: SceneSurface;
  seed?: string | undefined;
  data?: DeviceData | undefined;
};

const inkFor = (surface: SceneSurface) => surface === "dark"
  ? "rgba(255,255,255,0.34)"
  : "rgba(0,0,0,0.26)";

const softFor = (surface: SceneSurface) => surface === "dark"
  ? "rgba(255,255,255,0.08)"
  : "rgba(0,0,0,0.06)";

const rand = (seed: string, salt: string): number => random(seed + ":" + salt);

type DeviceProps = {surface: SceneSurface; seed: string; data?: DeviceData | undefined};

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

const TwoTracks: React.FC<DeviceProps> = ({surface, seed, data}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - 5, fps, config: motion.spring.editorial});
  const drift = interpolate(frame, [0, 150], [0, 1], {extrapolateRight: "clamp"});
  const ink = inkFor(surface);
  const first = data?.values?.[0] ?? null;
  const second = data?.values?.[1] ?? null;
  // Kemiringan & panjang jalur hero mengikuti rasio data asli bila tersedia.
  const ratio = first !== null && second !== null && first > 0 ? Math.min(2.4, Math.max(0.45, second / first)) : null;
  const upAngle = 18 + rand(seed, "up") * 10;
  const downAngle = ratio === null ? 18 + rand(seed, "down") * 10 : Math.min(32, Math.max(10, 20 * ratio));
  const heroLen = ratio === null ? 215 + rand(seed, "hero") * 45 : Math.min(320, Math.max(150, 210 * ratio));
  const cardCount = 2 + Math.floor(rand(seed, "cards") * 2);
  return <div style={{position: "absolute", right: 34, top: 495 + Math.round(rand(seed, "top") * 45), width: 520, height: 470, color: ink, opacity: 0.94, transform: `translateX(${(1 - p) * 85}px)`}}>
    <div style={{position: "absolute", left: 18, top: 30, width: 205 + Math.round(rand(seed, "base") * 40), height: 8, background: ink, transform: `rotate(-${upAngle}deg)`, transformOrigin: "left"}} />
    <div style={{position: "absolute", left: 240, top: 180, width: heroLen, height: 8, background: colors.orange, transform: `rotate(${downAngle}deg) scaleX(${p})`, transformOrigin: "left"}} />
    {Array.from({length: cardCount}).map((_, index) => {
      const cp = spring({frame: frame - 4 - index * 4, fps, config: motion.spring.tight});
      return <Card key={index} x={50 + index * (36 + Math.round(rand(seed, "cx" + index) * 16)) + drift * 16} y={75 + index * (46 + Math.round(rand(seed, "cy" + index) * 16))} rotate={-16 + rand(seed, "cr" + index) * 9} opacity={(0.35 + index * 0.18) * Math.min(1, cp * 1.4)} />;
    })}
    {[0, 1, 2].map((index) => {
      const np = spring({frame: frame - 8 - index * 4, fps, config: motion.spring.tight});
      return <div key={index} style={{position: "absolute", left: 282 + Math.round(rand(seed, "dx" + index) * 130), top: 202 + index * (64 + Math.round(rand(seed, "dy" + index) * 24)), width: 30 + Math.round(rand(seed, "ds" + index) * 16), height: 30 + Math.round(rand(seed, "ds" + index) * 16), borderRadius: "50%", background: index === 2 ? colors.orange : ink, transform: `scale(${0.4 + np * 0.6})`}} />;
    })}
  </div>;
};

const EvidenceScan: React.FC<DeviceProps> = ({surface, seed}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ink = inkFor(surface);
  const soft = softFor(surface);
  const p = spring({frame: frame - 3, fps, config: motion.spring.editorial});
  const scan = interpolate(frame, [8, 60], [0, 1], {extrapolateRight: "clamp"});
  const stampPop = spring({frame: frame - 30, fps, config: motion.spring.tight});
  const lineCount = 4 + Math.floor(rand(seed, "lines") * 3);
  const hot = Math.floor(rand(seed, "hot") * lineCount);
  const tilt = -5 + rand(seed, "tilt") * 10;
  const stampRight = 20 + Math.round(rand(seed, "stamp") * 40);
  const ring = 96 + Math.round(rand(seed, "ring") * 20);
  return <div style={{position: "absolute", right: 44, bottom: 285 + Math.round(rand(seed, "bottom") * 40), width: 430, height: 530, color: ink, opacity: 0.9, transform: `translateX(${(1 - p) * 70}px)`}}>
    <div style={{position: "absolute", inset: 0, border: `3px solid ${ink}`, background: soft, transform: `rotate(${tilt}deg)`}} />
    {Array.from({length: lineCount}).map((_, index) => {
      const lp = spring({frame: frame - 6 - index * 3, fps, config: motion.spring.editorial});
      return <div key={index} style={{position: "absolute", left: 55, top: 80 + index * Math.round(300 / lineCount), width: index === hot ? 260 : 190 + Math.round(rand(seed, "lw" + index) * 125), height: 10, background: index === hot ? colors.orange : ink, opacity: index === hot ? 0.86 : 0.5, transform: `scaleX(${lp})`, transformOrigin: "left"}} />;
    })}
    <div style={{position: "absolute", left: 32, right: 32, top: 55 + scan * 325, height: 8, background: colors.orange, boxShadow: `0 0 0 8px ${colors.orange16}`}} />
    <div style={{position: "absolute", right: stampRight, top: 40, width: ring, height: ring, border: `6px solid ${colors.orange}`, borderRadius: "50%", transform: `scale(${0.5 + stampPop * 0.5})`}} />
    <div style={{position: "absolute", right: stampRight - 23, top: 135, width: 62, height: 7, background: colors.orange, transform: "rotate(45deg)", opacity: stampPop}} />
  </div>;
};

const DecisionGraph: React.FC<DeviceProps> = ({surface, seed, data}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ink = inkFor(surface);
  const pathIn = spring({frame: frame - 4, fps, config: motion.spring.soft});
  const values = (data?.values ?? []).filter((v) => Number.isFinite(v) && v >= 0);
  const count = values.length >= 3 ? Math.min(6, values.length) : 4 + Math.floor(rand(seed, "count") * 3);
  const maxValue = values.length >= 3 ? Math.max(...values) : 0;
  const nodes = Array.from({length: count}).map((_, index) => {
    const size = maxValue > 0 ? 38 + ((values[index % values.length] ?? 0) / maxValue) * 54 : 42 + rand(seed, "s" + index) * 46;
    return {
      x: 15 + rand(seed, "x" + index) * 400,
      y: 25 + (index * 380) / count + rand(seed, "y" + index) * 55,
      s: size,
    };
  });
  const path = nodes.map((node, index) => (index === 0 ? "M " : "L ") + Math.round(node.x + node.s / 2) + " " + Math.round(node.y + node.s / 2)).join(" ");
  return <div style={{position: "absolute", right: 22, top: 640 + Math.round(rand(seed, "top") * 60), width: 530, height: 520, color: ink, opacity: 0.78}}>
    <svg width="530" height="520" viewBox="0 0 530 520" style={{position: "absolute", inset: 0, opacity: pathIn}}>
      <path d={path} fill="none" stroke={ink} strokeWidth="4" strokeDasharray="10 12" />
    </svg>
    {nodes.map((node, index) => {
      const np = spring({frame: frame - 4 - index * 3, fps, config: motion.spring.tight});
      return <div key={index} style={{position: "absolute", left: node.x, top: node.y, width: node.s, height: node.s, borderRadius: "50%", border: `5px solid ${index >= count - 2 ? colors.orange : ink}`, background: index === count - 1 ? colors.orange16 : "transparent", transform: `scale(${0.4 + np * 0.6})`, transformOrigin: "center"}} />;
    })}
  </div>;
};

const TaskSystem: React.FC<DeviceProps> = ({surface, seed, data}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ink = inkFor(surface);
  const spineIn = spring({frame: frame - 8, fps, config: motion.spring.soft});
  const values = data?.values ?? [];
  const count = values.length >= 2 ? Math.min(5, values.length) : 3 + Math.floor(rand(seed, "count") * 2);
  const step = Math.round(608 / count);
  return <div style={{position: "absolute", right: 22, top: 535, width: 360, height: 720, color: ink, opacity: 0.84}}>
    {Array.from({length: count}).map((_, index) => {
      const accent = values.length >= 2 ? (values[index] ?? 0) > 0 : index < 2;
      const bp = spring({frame: frame - 5 - index * 4, fps, config: motion.spring.editorial});
      return <div key={index} style={{position: "absolute", right: index % 2 ? 38 : 0, top: index * step, width: 195 + Math.round(rand(seed, "w" + index) * 45), height: Math.min(92, step - 22), border: `3px solid ${accent ? colors.orange : ink}`, transform: `translateX(${(1 - bp) * (index % 2 ? 58 : -58)}px)`, background: index === 0 && accent ? colors.orange16 : "transparent"}} />;
    })}
    <div style={{position: "absolute", left: 120 + Math.round(rand(seed, "spine") * 30), top: 78, height: Math.max(200, step * (count - 1)), width: 5, background: ink, opacity: 0.5, transform: `scaleY(${spineIn})`, transformOrigin: "top"}} />
  </div>;
};

const PrioritySignal: React.FC<DeviceProps> = ({surface, seed, data}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const ink = inkFor(surface);
  const values = (data?.values ?? []).filter((v) => Number.isFinite(v) && v > 0).slice(0, 4);
  if (values.length > 0) {
    // Batang HANYA dari data asli: tinggi proporsional terhadap skala nyata.
    const scale = Math.max(data?.max ?? 0, ...values);
    const hero = Math.min(data?.highlightIndex ?? values.length - 1, values.length - 1);
    const barWidth = values.length <= 2 ? 64 : 48;
    const gap = values.length <= 2 ? 105 : 78;
    const axisIn = spring({frame: frame - 3, fps, config: motion.spring.soft});
    return <div style={{position: "absolute", right: 46, bottom: 250, width: 400, height: 500, color: ink, opacity: 0.86}}>
      <div style={{position: "absolute", left: 34, right: 12, bottom: 30, height: 4, background: ink, opacity: 0.55, transform: `scaleX(${axisIn})`, transformOrigin: "left"}} />
      {values.map((value, index) => {
        const bp = spring({frame: frame - 6 - index * 4, fps, config: motion.spring.tight});
        return <div key={index} style={{position: "absolute", left: 45 + index * gap, bottom: 34, width: barWidth, height: Math.max(24, (value / scale) * 370) * bp, background: index === hero ? colors.white : ink, border: index === hero ? `4px solid ${colors.black}` : "none"}} />;
      })}
    </div>;
  }
  // Tanpa data nyata: metafora sinyal non-kuantitatif — tanpa batang/sumbu.
  const rise = spring({frame: frame - 4, fps, config: motion.spring.editorial});
  return <div style={{position: "absolute", right: 46, bottom: 250, width: 400, height: 500, color: ink, opacity: 0.86}}>
    <div style={{position: "absolute", left: 30 + Math.round(rand(seed, "bx") * 40), top: 60, width: 300, height: 5, background: colors.black, transform: `rotate(-${25 + rand(seed, "ba") * 16}deg) scaleX(${rise})`, transformOrigin: "left"}} />
    {[0, 1, 2].map((index) => {
      const mp = spring({frame: frame - 6 - index * 4, fps, config: motion.spring.tight});
      return <div key={index} style={{position: "absolute", left: 60 + Math.round(rand(seed, "mx" + index) * 250), top: 150 + index * 105 + Math.round(rand(seed, "my" + index) * 45), width: 26 + Math.round(rand(seed, "ms" + index) * 20), height: 26 + Math.round(rand(seed, "ms" + index) * 20), background: index === 2 ? colors.white : "transparent", border: `4px solid ${index === 2 ? colors.black : ink}`, transform: `rotate(45deg) scale(${0.5 + mp * 0.5})`}} />;
    })}
  </div>;
};

export const NarrativeDevice: React.FC<NarrativeDeviceProps> = ({kind, surface, seed, data}) => {
  const key = seed ?? kind;
  switch (kind) {
    case "two_tracks": return <TwoTracks surface={surface} seed={key} data={data} />;
    case "evidence_scan": return <EvidenceScan surface={surface} seed={key} data={data} />;
    case "decision_graph": return <DecisionGraph surface={surface} seed={key} data={data} />;
    case "task_system": return <TaskSystem surface={surface} seed={key} data={data} />;
    case "priority_signal": return <PrioritySignal surface={surface} seed={key} data={data} />;
  }
};
