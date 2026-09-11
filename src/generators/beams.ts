import { circlePoints, makeId, tagGroup } from "../shapes";
import { spiralPoints } from "./spiral";
import type { LaserObject, LFOConfig, LFOType, Point, RGB } from "../types";

export interface BeamParams {
  center?: Point;
  count: number;
  length: number;
  angleSpread?: number; // deg, used by fan/sweep
  rotationOffset?: number; // deg
  rotationSpeed?: number; // rev/sec, 0 = static
  color: RGB;
  intensity: number;
}

function rotationLFO(type: LFOType, amplitude: number, frequency: number, phase = 0): LFOConfig | undefined {
  if (!frequency) return undefined;
  return { type, amplitude, frequency, phase };
}

function beamObject(name: string, center: Point, angleDeg: number, length: number, color: RGB, intensity: number): LaserObject {
  return {
    id: makeId(),
    name,
    shapeType: "line",
    localPoints: [
      { x: 0, y: 0 },
      { x: length, y: 0 },
    ],
    closed: false,
    x: center.x,
    y: center.y,
    rotation: angleDeg,
    scale: 1,
    color,
    intensity,
    visible: true,
  };
}

// Beams evenly spread across an arc, all pivoting together if rotationSpeed > 0.
export function fan(p: BeamParams): LaserObject[] {
  const center = p.center ?? { x: 0, y: 0 };
  const spread = p.angleSpread ?? 60;
  const base = p.rotationOffset ?? 0;
  const step = p.count > 1 ? spread / (p.count - 1) : 0;
  const lfo = rotationLFO("saw", 180, p.rotationSpeed ?? 0);
  return tagGroup(
    Array.from({ length: p.count }, (_, i) => {
      const angle = base - spread / 2 + step * i;
      const obj = beamObject(`Fan Beam ${i + 1}`, center, angle, p.length, p.color, p.intensity);
      if (lfo) obj.lfos = { rotation: lfo };
      return obj;
    }),
    "Fan",
  );
}

// Beams oscillating back and forth across an arc (phase-staggered if count > 1).
export function sweep(p: BeamParams): LaserObject[] {
  const center = p.center ?? { x: 0, y: 0 };
  const base = p.rotationOffset ?? 0;
  const half = (p.angleSpread ?? 90) / 2;
  const speed = p.rotationSpeed || 0.5;
  const count = Math.max(1, p.count);
  return tagGroup(
    Array.from({ length: count }, (_, i) => {
      const obj = beamObject(`Sweep Beam ${i + 1}`, center, base, p.length, p.color, p.intensity);
      obj.lfos = { rotation: rotationLFO("triangle", half, speed, (i / count) * Math.PI * 2) };
      return obj;
    }),
    "Sweep",
  );
}

// Beams spaced evenly around the full circle, optionally spinning together.
export function radial(p: BeamParams): LaserObject[] {
  const center = p.center ?? { x: 0, y: 0 };
  const base = p.rotationOffset ?? 0;
  const step = 360 / p.count;
  const lfo = rotationLFO("saw", 180, p.rotationSpeed ?? 0);
  return tagGroup(
    Array.from({ length: p.count }, (_, i) => {
      const angle = base + step * i;
      const obj = beamObject(`Radial Beam ${i + 1}`, center, angle, p.length, p.color, p.intensity);
      if (lfo) obj.lfos = { rotation: lfo };
      return obj;
    }),
    "Radial",
  );
}

// Concentric rings that pulse outward at staggered phases to fake a tunnel of light.
export function tunnel(p: BeamParams): LaserObject[] {
  const center = p.center ?? { x: 0, y: 0 };
  const speed = p.rotationSpeed || 0.3;
  const scaleAmp = p.length / 2;
  return tagGroup(
    Array.from({ length: p.count }, (_, i): LaserObject => ({
      id: makeId(),
      name: `Tunnel Ring ${i + 1}`,
      shapeType: "circle",
      localPoints: circlePoints(),
      closed: true,
      x: center.x,
      y: center.y,
      rotation: 0,
      scale: scaleAmp,
      color: p.color,
      intensity: p.intensity,
      visible: true,
      lfos: { scale: { type: "saw", amplitude: scaleAmp, frequency: speed, phase: (i / p.count) * Math.PI * 2 } },
    })),
    "Tunnel",
  );
}

// Archimedean spiral arm(s) from the center, optionally spinning as a whole.
export function spiralBeam(p: BeamParams): LaserObject[] {
  const center = p.center ?? { x: 0, y: 0 };
  const points = spiralPoints({ turns: 2, length: p.length });
  const lfo = rotationLFO("saw", 180, p.rotationSpeed ?? 0.2);
  const arms = Math.max(1, p.count);
  return tagGroup(
    Array.from({ length: arms }, (_, i) => {
      const obj: LaserObject = {
        id: makeId(),
        name: `Spiral Arm ${i + 1}`,
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
      };
      if (lfo) obj.lfos = { rotation: lfo };
      return obj;
    }),
    "Spiral Beam",
  );
}
