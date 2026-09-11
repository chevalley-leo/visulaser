import { noise1D } from "./noise";
import { wavePoints } from "./generators/wave";
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
  if (!obj.tracks && !obj.lfos && !obj.waveScroll && !obj.activeRange && !obj.particleField) return obj;

  const result = { ...obj };
  for (const prop of PROPS) {
    let value = obj[prop];
    const track = obj.tracks?.[prop];
    if (track && track.length > 0) value = interpolateTrack(track, t);
    const lfo = obj.lfos?.[prop];
    if (lfo) value += lfoValue(lfo, t);
    result[prop] = prop === "intensity" ? Math.max(0, Math.min(1, value)) : value;
  }
  if (obj.waveScroll) {
    const ws = obj.waveScroll;
    result.localPoints = wavePoints({
      width: ws.width,
      amplitude: ws.amplitude,
      frequency: ws.frequency,
      noiseAmount: ws.noiseAmount,
      seed: ws.seed,
      segments: ws.segments,
      phase: (ws.phase ?? 0) + 2 * Math.PI * ws.speed * t,
      color: obj.color,
      intensity: obj.intensity,
    });
  }
  if (obj.particleField) {
    const pf = obj.particleField;
    result.localPoints = Array.from({ length: pf.count }, (_, i) => {
      const baseX = noise1D(i * 2.13, pf.seed) * pf.spread;
      const baseY = noise1D(i * 2.13 + 100, pf.seed) * pf.spread;
      const freqX = pf.wanderSpeed * (0.7 + (noise1D(i * 3.1, pf.seed) * 0.5 + 0.5) * 0.6);
      const freqY = pf.wanderSpeed * (0.7 + (noise1D(i * 3.1 + 7, pf.seed) * 0.5 + 0.5) * 0.6);
      const wx = noise1D(t * freqX, pf.seed + i * 7.3) * pf.wanderAmount;
      const wy = noise1D(t * freqY, pf.seed + i * 7.3 + 50) * pf.wanderAmount;
      return { x: baseX + wx, y: baseY + wy };
    });
  }
  if (obj.activeRange) {
    const { start, end } = obj.activeRange;
    if (t < start || t > end) {
      result.visible = false;
    } else {
      const fadeDur = Math.min(0.3, (end - start) / 2);
      const factor =
        t < start + fadeDur ? (t - start) / fadeDur : t > end - fadeDur ? (end - t) / fadeDur : 1;
      result.intensity = Math.max(0, Math.min(1, result.intensity * factor));
    }
  }
  return result;
}
