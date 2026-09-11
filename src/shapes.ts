import type { LaserObject, Point, ShapeType } from "./types";

export function makeId(): string {
  return crypto.randomUUID();
}

export function defaultColor() {
  return { r: 0, g: 255, b: 80 };
}

// Applies rotation + scale (no translation) to a local point.
export function rotateScale(p: Point, rotationDeg: number, scale: number): Point {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const x = p.x * scale;
  const y = p.y * scale;
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

// World-space points of an object (local geometry transformed by rotation/scale/position).
export function getWorldPoints(obj: LaserObject): Point[] {
  return obj.localPoints.map((p) => {
    const rs = rotateScale(p, obj.rotation, obj.scale);
    return { x: rs.x + obj.x, y: rs.y + obj.y };
  });
}

function circlePoints(segments = 48): Point[] {
  const pts: Point[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push({ x: Math.cos(a), y: Math.sin(a) });
  }
  return pts;
}

export function isClosedShape(shapeType: ShapeType): boolean {
  return shapeType === "rect" || shapeType === "circle" || shapeType === "polygon";
}

export function createPointObject(pos: Point): LaserObject {
  return {
    id: makeId(),
    name: "Point",
    shapeType: "point",
    localPoints: [{ x: 0, y: 0 }],
    closed: false,
    x: pos.x,
    y: pos.y,
    rotation: 0,
    scale: 1,
    color: defaultColor(),
    intensity: 1,
    visible: true,
  };
}

export function createLineObject(start: Point, end: Point): LaserObject {
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  return {
    id: makeId(),
    name: "Line",
    shapeType: "line",
    localPoints: [
      { x: start.x - mid.x, y: start.y - mid.y },
      { x: end.x - mid.x, y: end.y - mid.y },
    ],
    closed: false,
    x: mid.x,
    y: mid.y,
    rotation: 0,
    scale: 1,
    color: defaultColor(),
    intensity: 1,
    visible: true,
  };
}

export function createRectObject(a: Point, b: Point): LaserObject {
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  const hw = Math.abs(a.x - b.x) / 2;
  const hh = Math.abs(a.y - b.y) / 2;
  return {
    id: makeId(),
    name: "Rectangle",
    shapeType: "rect",
    localPoints: [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh },
    ],
    closed: true,
    x: cx,
    y: cy,
    rotation: 0,
    scale: 1,
    color: defaultColor(),
    intensity: 1,
    visible: true,
  };
}

export function createCircleObject(center: Point, edge: Point): LaserObject {
  const radius = Math.hypot(edge.x - center.x, edge.y - center.y) || 0.001;
  return {
    id: makeId(),
    name: "Circle",
    shapeType: "circle",
    localPoints: circlePoints().map((p) => ({ x: p.x * radius, y: p.y * radius })),
    closed: true,
    x: center.x,
    y: center.y,
    rotation: 0,
    scale: 1,
    color: defaultColor(),
    intensity: 1,
    visible: true,
  };
}

export function createPolygonObject(worldPts: Point[]): LaserObject {
  const cx = worldPts.reduce((s, p) => s + p.x, 0) / worldPts.length;
  const cy = worldPts.reduce((s, p) => s + p.y, 0) / worldPts.length;
  return {
    id: makeId(),
    name: "Polygon",
    shapeType: "polygon",
    localPoints: worldPts.map((p) => ({ x: p.x - cx, y: p.y - cy })),
    closed: true,
    x: cx,
    y: cy,
    rotation: 0,
    scale: 1,
    color: defaultColor(),
    intensity: 1,
    visible: true,
  };
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  let t = lenSq === 0 ? 0 : ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const proj = { x: a.x + t * abx, y: a.y + t * aby };
  return Math.hypot(p.x - proj.x, p.y - proj.y);
}

export function hitTest(obj: LaserObject, worldPoint: Point, threshold: number): boolean {
  const pts = getWorldPoints(obj);
  if (pts.length === 1) {
    return Math.hypot(worldPoint.x - pts[0].x, worldPoint.y - pts[0].y) <= threshold;
  }
  const count = obj.closed ? pts.length : pts.length - 1;
  for (let i = 0; i < count; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    if (distToSegment(worldPoint, a, b) <= threshold) return true;
  }
  return false;
}
