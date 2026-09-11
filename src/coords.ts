import type { Point } from "./types";

// Maps normalized laser space (-1..1, Y up) to canvas pixel space (Y down).
export function worldToCanvas(p: Point, w: number, h: number): Point {
  const half = (Math.min(w, h) / 2) * 0.9;
  return { x: w / 2 + p.x * half, y: h / 2 - p.y * half };
}

export function canvasToWorld(p: Point, w: number, h: number): Point {
  const half = (Math.min(w, h) / 2) * 0.9;
  return { x: (p.x - w / 2) / half, y: -(p.y - h / 2) / half };
}
