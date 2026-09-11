import { noise2D } from "../noise";
import { makeId, tagGroup } from "../shapes";
import type { LaserObject, Point, RGB } from "../types";

export interface SpiralPointsParams {
  turns: number;
  length: number; // outer radius
  segments?: number;
  noiseAmount?: number; // 0..1, radius wobble
  seed?: number;
}

// Archimedean spiral: radius grows linearly with angle. Shared by the Spiral
// generator below and the beam engine's spiralBeam.
export function spiralPoints(p: SpiralPointsParams): Point[] {
  const segments = p.segments ?? 120;
  const noiseAmt = p.noiseAmount ?? 0;
  const seed = p.seed ?? 0;
  return Array.from({ length: segments + 1 }, (_, i) => {
    const t = i / segments;
    const angle = t * p.turns * Math.PI * 2;
    let r = t * p.length;
    if (noiseAmt) r += noiseAmt * p.length * noise2D(Math.cos(angle) * 2, Math.sin(angle) * 2 + t * 5, seed);
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
  });
}

export interface SpiralParams extends SpiralPointsParams {
  center?: Point;
  arms?: number;
  rotationOffset?: number; // deg
  color: RGB;
  intensity: number;
}

export function spiral(p: SpiralParams): LaserObject[] {
  const center = p.center ?? { x: 0, y: 0 };
  const points = spiralPoints(p);
  const arms = Math.max(1, p.arms ?? 1);
  const objs = Array.from({ length: arms }, (_, i): LaserObject => ({
    id: makeId(),
    name: `Spiral ${i + 1}`,
    shapeType: "polygon",
    localPoints: points,
    closed: false,
    x: center.x,
    y: center.y,
    rotation: (p.rotationOffset ?? 0) + (360 / arms) * i,
    scale: 1,
    color: p.color,
    intensity: p.intensity,
    visible: true,
  }));
  return arms > 1 ? tagGroup(objs, "Spiral Shape") : objs;
}
