import { noise1D } from "../noise";
import { makeId } from "../shapes";
import type { LaserObject, Point, RGB } from "../types";

export interface ParticlesParams {
  center?: Point;
  count: number;
  spread: number; // radius of the scatter area
  wanderAmount?: number; // 0..1, how far each particle drifts from its spot
  wanderSpeed?: number; // Hz, base drift speed
  flicker?: boolean; // shimmer via a shared intensity LFO
  seed?: number;
  color: RGB;
  intensity: number;
}

export function particleFieldPoints(count: number, spread: number, seed: number): Point[] {
  return Array.from({ length: count }, (_, i) => ({
    x: noise1D(i * 2.13, seed) * spread,
    y: noise1D(i * 2.13 + 100, seed) * spread,
  }));
}

// One LaserObject holding the whole cloud (rendered as a scatter of dots via
// shapeType "points", animated per-frame by particleField in animation.ts)
// instead of one point-object per particle — a scene with 30 particles used
// to mean 30 rows in every panel.
export function particles(p: ParticlesParams): LaserObject[] {
  const center = p.center ?? { x: 0, y: 0 };
  const seed = p.seed ?? 0;
  const obj: LaserObject = {
    id: makeId(),
    name: "Particles",
    shapeType: "points",
    localPoints: particleFieldPoints(p.count, p.spread, seed),
    closed: false,
    x: center.x,
    y: center.y,
    rotation: 0,
    scale: 1,
    color: p.color,
    intensity: p.intensity,
    visible: true,
    particleField: {
      count: p.count,
      spread: p.spread,
      wanderAmount: p.wanderAmount ?? 0.05,
      wanderSpeed: p.wanderSpeed || 0.2,
      seed,
    },
  };
  if (p.flicker) {
    obj.lfos = { intensity: { type: "sine", amplitude: 0.3, frequency: 0.8, phase: 0 } };
  }
  return [obj];
}
