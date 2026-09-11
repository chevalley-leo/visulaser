// Presets are parameter sets (pool of generator kinds, base hue, movement/chaos
// bias), not baked animations — the Scene Generator composes fresh objects
// from them every time.

export type SceneStyle = "geometric" | "organic" | "chaotic" | "energetic" | "ambient" | "techno";

export type ElementKind = "fan" | "sweep" | "radial" | "tunnel" | "spiralBeam" | "wave" | "spiral" | "star" | "particles";

export interface StylePreset {
  label: string;
  hueBase: number; // 0..360
  pool: ElementKind[];
  spread: number; // how far element centers scatter from origin
  movementBias: number; // multiplier on rotation/scroll speed
  chaosBias: number; // multiplier on noise/jitter amount
}

export const STYLE_PRESETS: Record<SceneStyle, StylePreset> = {
  geometric: {
    label: "Geometric",
    hueBase: 210,
    pool: ["fan", "radial", "sweep", "star"],
    spread: 0.6,
    movementBias: 0.6,
    chaosBias: 0.1,
  },
  organic: {
    label: "Organic",
    hueBase: 120,
    pool: ["wave", "spiral", "star", "particles"],
    spread: 0.75,
    movementBias: 0.5,
    chaosBias: 0.8,
  },
  chaotic: {
    label: "Chaotic",
    hueBase: 280,
    pool: ["fan", "sweep", "spiral", "spiralBeam", "particles", "star"],
    spread: 0.95,
    movementBias: 1.3,
    chaosBias: 1.5,
  },
  energetic: {
    label: "Energetic",
    hueBase: 10,
    pool: ["radial", "tunnel", "sweep", "spiralBeam"],
    spread: 0.65,
    movementBias: 1.4,
    chaosBias: 0.4,
  },
  ambient: {
    label: "Ambient",
    hueBase: 260,
    pool: ["wave", "particles", "star"],
    spread: 0.8,
    movementBias: 0.25,
    chaosBias: 0.3,
  },
  techno: {
    label: "Techno",
    hueBase: 190,
    pool: ["tunnel", "radial", "fan", "spiralBeam"],
    spread: 0.6,
    movementBias: 1.6,
    chaosBias: 0.5,
  },
};
