export type ShapeType = "point" | "line" | "rect" | "circle" | "polygon" | "points";

export interface Point {
  x: number;
  y: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export type AnimatableProp = "x" | "y" | "rotation" | "scale" | "intensity";

export interface Keyframe {
  id: string;
  time: number; // seconds
  value: number;
}

export type LFOType = "sine" | "triangle" | "square" | "saw" | "noise";

export interface LFOConfig {
  type: LFOType;
  amplitude: number;
  frequency: number; // Hz
  phase: number; // radians
}

// A LaserObject is defined by geometry in local space (centered at origin,
// unit scale) plus a world transform. This mirrors how the future laser
// renderer will need to convert shapes into ILDA points (section 30/35).
export interface LaserObject {
  id: string;
  name: string;
  shapeType: ShapeType;
  localPoints: Point[];
  closed: boolean;
  x: number;
  y: number;
  rotation: number; // degrees
  scale: number;
  color: RGB;
  intensity: number; // 0..1
  visible: boolean;
  tracks?: Partial<Record<AnimatableProp, Keyframe[]>>;
  lfos?: Partial<Record<AnimatableProp, LFOConfig>>;
  // Set when several LaserObjects were produced together by one generator
  // call (a fan's beams, a spiral's arms) so panels can collapse them into
  // a single row instead of listing every sub-object.
  groupId?: string;
  groupName?: string;
  // Like an audio clip on a track: the object is only active within
  // [start, end] (seconds), with a short automatic fade at both edges.
  // Undefined = active for the whole scene (unchanged legacy behavior).
  activeRange?: { start: number; end: number };
  // When set, geometry is recomputed every frame as a scrolling sine wave
  // instead of using the static localPoints — LFOs only move/rotate/scale
  // the whole object, they can't animate the shape itself.
  waveScroll?: {
    width: number;
    amplitude: number;
    frequency: number;
    noiseAmount?: number;
    seed?: number;
    segments?: number;
    phase?: number; // radians, base offset before scrolling
    speed: number; // cycles/sec added to phase over time
  };
  // When set, localPoints is recomputed every frame as a scatter of `count`
  // noise-driven dots — lets a whole particle cloud live in one LaserObject
  // instead of one object per particle.
  particleField?: {
    count: number;
    spread: number;
    wanderAmount: number;
    wanderSpeed: number;
    seed: number;
  };
}

// Output of the laser renderer (Phase 7): what actually gets sent to the DAC.
// `blanking` points move the galvo without firing the beam (travel between
// shapes); everything else is a lit sample along a resampled path.
export interface LaserPoint {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  intensity: number;
  blanking: boolean;
}

export interface Scene {
  id: string;
  name: string;
  duration: number; // seconds
  objects: LaserObject[];
}

export type Tool = "select" | "point" | "line" | "rect" | "circle" | "polygon";
