import { noise1D } from "../noise";
import { makeId } from "../shapes";
import type { LaserObject, Point, RGB } from "../types";

export interface WaveParams {
  center?: Point;
  width: number; // total horizontal extent
  amplitude: number;
  frequency: number; // cycles across the width
  phase?: number; // radians
  noiseAmount?: number; // 0..1, additional wobble
  seed?: number;
  segments?: number;
  rotationOffset?: number; // deg, orient the wave line
  scrollSpeed?: number; // cycles/sec, animates the wave scrolling sideways
  color: RGB;
  intensity: number;
}

export function wavePoints(p: WaveParams): Point[] {
  const segments = p.segments ?? 96;
  const phase = p.phase ?? 0;
  const noiseAmt = p.noiseAmount ?? 0;
  const seed = p.seed ?? 0;
  return Array.from({ length: segments + 1 }, (_, i) => {
    const t = i / segments;
    const x = (t - 0.5) * p.width;
    let y = Math.sin(t * p.frequency * Math.PI * 2 + phase) * p.amplitude;
    if (noiseAmt) y += noiseAmt * p.amplitude * noise1D(t * p.frequency * 4, seed);
    return { x, y };
  });
}

export function wave(p: WaveParams): LaserObject[] {
  const center = p.center ?? { x: 0, y: 0 };
  const obj: LaserObject = {
    id: makeId(),
    name: "Wave",
    shapeType: "polygon",
    localPoints: wavePoints(p),
    closed: false,
    x: center.x,
    y: center.y,
    rotation: p.rotationOffset ?? 0,
    scale: 1,
    color: p.color,
    intensity: p.intensity,
    visible: true,
  };
  if (p.scrollSpeed) {
    obj.waveScroll = {
      width: p.width,
      amplitude: p.amplitude,
      frequency: p.frequency,
      noiseAmount: p.noiseAmount,
      seed: p.seed,
      segments: p.segments,
      phase: p.phase ?? 0,
      speed: p.scrollSpeed,
    };
  }
  return [obj];
}
