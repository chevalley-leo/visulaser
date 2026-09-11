import type { AnimatableProp, Keyframe, LaserObject, LFOConfig } from "./types";

function interpolateTrack(keyframes: Keyframe[], t: number): number {
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  if (t <= sorted[0].time) return sorted[0].value;
  if (t >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value;
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (t >= a.time && t <= b.time) {
      const span = b.time - a.time;
      const f = span === 0 ? 0 : (t - a.time) / span;
      return a.value + (b.value - a.value) * f;
    }
  }
  return sorted[sorted.length - 1].value;
}

// ponytail: cheap deterministic hash noise, not real Perlin — fine for a wobble LFO, upgrade if it looks too jittery.
function hash1D(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function noise1D(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash1D(i);
  const b = hash1D(i + 1);
  const smooth = f * f * (3 - 2 * f);
  return (a + (b - a) * smooth) * 2 - 1;
}

function lfoValue(lfo: LFOConfig, t: number): number {
  const phase = 2 * Math.PI * lfo.frequency * t + lfo.phase;
  let wave: number;
  switch (lfo.type) {
    case "sine":
      wave = Math.sin(phase);
      break;
    case "triangle":
      wave = (2 / Math.PI) * Math.asin(Math.sin(phase));
      break;
    case "square":
      wave = Math.sign(Math.sin(phase)) || 1;
      break;
    case "saw": {
      const cycles = lfo.frequency * t + lfo.phase / (2 * Math.PI);
      wave = 2 * (cycles - Math.floor(cycles + 0.5));
      break;
    }
    case "noise":
      wave = noise1D(lfo.frequency * t);
      break;
  }
  return wave * lfo.amplitude;
}

const PROPS: AnimatableProp[] = ["x", "y", "rotation", "scale", "intensity"];

// Merges base object values with keyframe tracks and LFOs at time t.
// Rendering should always go through this so animated and static objects look the same.
export function evaluateObjectAtTime(obj: LaserObject, t: number): LaserObject {
  if (!obj.tracks && !obj.lfos) return obj;

  const result = { ...obj };
  for (const prop of PROPS) {
    let value = obj[prop];
    const track = obj.tracks?.[prop];
    if (track && track.length > 0) value = interpolateTrack(track, t);
    const lfo = obj.lfos?.[prop];
    if (lfo) value += lfoValue(lfo, t);
    result[prop] = prop === "intensity" ? Math.max(0, Math.min(1, value)) : value;
  }
  return result;
}
