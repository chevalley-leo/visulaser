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
}

export interface Scene {
  id: string;
  name: string;
  objects: LaserObject[];
}

export type Tool = "select" | "point" | "line" | "rect" | "circle" | "polygon";
