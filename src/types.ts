export type ShapeType = "point" | "line" | "rect" | "circle" | "polygon";

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
}

export interface Scene {
  id: string;
  name: string;
  duration: number; // seconds
  objects: LaserObject[];
}

export type Tool = "select" | "point" | "line" | "rect" | "circle" | "polygon";
