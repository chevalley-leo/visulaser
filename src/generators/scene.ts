import { mulberry32, uniform, weightedPick } from "../random";
import { hslToRgb } from "../color";
import { fan, radial, spiralBeam, sweep, tunnel } from "./beams";
import { wave } from "./wave";
import { spiral } from "./spiral";
import { particles } from "./particles";
import { createRadialShapeObject, makeId } from "../shapes";
import { STYLE_PRESETS } from "../styles";
import type { ElementKind, SceneStyle } from "../styles";
import type { LaserObject, RGB, Scene } from "../types";

export type ColorMode = "mono" | "complementary" | "rainbow";

export interface SceneGenParams {
  style: SceneStyle;
  complexity: number; // 0..1 -> number of elements
  density: number; // 0..1 -> beam/particle count per element
  movement: number; // 0..1 -> rotation/scroll speed
  chaos: number; // 0..1 -> noise/jitter amount
  buildUp: number; // 0..1 -> elements fade in staggered over time instead of all at once
  colorMode: ColorMode;
  duration: number;
  seed?: number;
}

// Gives each element a timeline block (same primitive the Timeline UI lets
// you drag/stretch by hand) starting at appearAt instead of at 0, with the
// fade-in handled automatically by evaluateObjectAtTime's edge fade.
function withBuildUp(objs: LaserObject[], appearAt: number, sceneEnd: number): LaserObject[] {
  return objs.map((o) => ({ ...o, activeRange: { start: appearAt, end: sceneEnd } }));
}

function hueForIndex(mode: ColorMode, base: number, i: number, count: number, rng: () => number): number {
  if (mode === "mono") return base + uniform(rng, -15, 15);
  if (mode === "complementary") return i % 2 === 0 ? base : base + 180;
  return (base + (i / Math.max(1, count)) * 360) % 360;
}

function colorFor(mode: ColorMode, base: number, i: number, count: number, rng: () => number): RGB {
  const hue = hueForIndex(mode, base, i, count, rng);
  return hslToRgb(hue, 0.85, uniform(rng, 0.45, 0.6));
}

export function generateScene(p: SceneGenParams): Scene {
  const preset = STYLE_PRESETS[p.style];
  const seed = p.seed ?? Math.floor(Math.random() * 1_000_000);
  const rng = mulberry32(seed);
  const elementCount = Math.max(1, Math.round(2 + p.complexity * 10));
  const objects: LaserObject[] = [];

  // Elements take evenly-spaced slots around a ring instead of pure uniform
  // random x/y — plain randomness tends to pile several elements near the
  // center. Chaos widens the jitter within each slot for less-tidy styles.
  const angleStep = (Math.PI * 2) / elementCount;
  const angleJitter = angleStep * (0.15 + p.chaos * 0.35);

  for (let i = 0; i < elementCount; i++) {
    const kind = weightedPick<ElementKind>(rng, preset.pool.map((k) => ({ value: k, weight: 1 })));
    const color = colorFor(p.colorMode, preset.hueBase, i, elementCount, rng);
    const intensity = uniform(rng, 0.6, 1);
    const placeAngle = i * angleStep + uniform(rng, -angleJitter, angleJitter);
    const placeRadius = uniform(rng, 0.5, 1) * preset.spread;
    const center = { x: Math.cos(placeAngle) * placeRadius, y: Math.sin(placeAngle) * placeRadius };
    const angle = uniform(rng, 0, 360);
    const count = Math.max(1, Math.round(3 + p.density * 12));
    const rotationSpeed = p.movement * preset.movementBias * uniform(rng, 0.05, 0.4);
    const noiseAmount = Math.min(1, p.chaos * preset.chaosBias * uniform(rng, 0.3, 1));
    const elemSeed = Math.floor(rng() * 1_000_000);

    let objs: LaserObject[];
    switch (kind) {
      case "fan":
        objs = fan({ count, length: uniform(rng, 0.4, 1), angleSpread: uniform(rng, 30, 120), rotationOffset: angle, rotationSpeed, color, intensity, center });
        break;
      case "sweep":
        objs = sweep({ count, length: uniform(rng, 0.4, 1), angleSpread: uniform(rng, 40, 140), rotationOffset: angle, rotationSpeed: rotationSpeed || 0.3, color, intensity, center });
        break;
      case "radial":
        objs = radial({ count, length: uniform(rng, 0.4, 1), rotationOffset: angle, rotationSpeed, color, intensity, center });
        break;
      case "tunnel":
        objs = tunnel({ count, length: uniform(rng, 0.5, 1.2), rotationSpeed: rotationSpeed || 0.3, color, intensity, center });
        break;
      case "spiralBeam":
        objs = spiralBeam({ count: Math.max(1, Math.round(count / 3)), length: uniform(rng, 0.4, 1), rotationOffset: angle, rotationSpeed, color, intensity, center });
        break;
      case "wave":
        objs = wave({
          width: uniform(rng, 0.8, 1.8),
          amplitude: uniform(rng, 0.15, 0.5),
          frequency: uniform(rng, 1, 6),
          noiseAmount,
          scrollSpeed: p.movement * preset.movementBias * uniform(rng, 0.1, 0.6),
          rotationOffset: angle,
          seed: elemSeed,
          color,
          intensity,
          center,
        });
        break;
      case "spiral":
        objs = spiral({
          turns: uniform(rng, 1, 4),
          length: uniform(rng, 0.3, 0.9),
          arms: Math.max(1, Math.round(count / 4)),
          noiseAmount,
          rotationOffset: angle,
          seed: elemSeed,
          color,
          intensity,
          center,
        });
        break;
      case "star": {
        const radius = uniform(rng, 0.25, 0.7);
        objs = [
          createRadialShapeObject(
            center,
            { x: center.x + radius, y: center.y },
            { points: Math.round(uniform(rng, 3, 10)), innerRatio: uniform(rng, 0.3, 0.8), distortion: noiseAmount, seed: elemSeed, color, intensity },
          ),
        ];
        break;
      }
      case "particles":
        objs = particles({
          center,
          count: Math.max(5, count * 2),
          spread: uniform(rng, 0.3, 0.9),
          wanderAmount: p.movement * 0.1,
          wanderSpeed: p.movement * preset.movementBias * 0.5,
          flicker: true,
          seed: elemSeed,
          color,
          intensity,
        });
        break;
    }

    if (p.buildUp > 0) {
      const appearWindow = p.duration * 0.6 * p.buildUp;
      const appearAt = (i / elementCount) * appearWindow;
      objs = withBuildUp(objs, appearAt, p.duration);
    }
    objects.push(...objs);
  }

  return { id: makeId(), name: `${preset.label} Scene`, duration: p.duration, objects };
}
