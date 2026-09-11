import type { Point } from "./types";

// Fixed "audience in the crowd" camera for Beam Preview, as opposed to the flat
// top-down projection (worldToCanvas) used by 2D/ILDA preview — which is really
// "the view from where the projector points at the wall". LaserObject has no z,
// so depth is invented per-point by the caller: beams run from Z_NEAR (the
// fixture) out to Z_FAR (where they fade into haze); flat shapes/particles sit
// on the Z_FAR plane like an image projected on a distant screen.
export const Z_NEAR = 0;
export const Z_FAR = 2.2;

// There's only one physical laser. Every object's own (x,y) is where its beam
// or shape lands on the wall it's projected onto — not a separate 3D origin —
// so every beam effect must converge here, not at its own generator "center"
// (which the scene layout scatters around to avoid overlap on the wall).
export const FIXTURE = { x: 0, y: 0 };

const EYE = { x: 0, y: -1.7, z: -1.6 };
const TARGET = { x: 0, y: 0.4, z: Z_FAR * 0.6 };
const FOCAL = 1.4; // ~70° vertical fov

function sub(a: typeof EYE, b: typeof EYE) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
function cross(a: typeof EYE, b: typeof EYE) {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}
function dot(a: typeof EYE, b: typeof EYE) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
function normalize(v: typeof EYE) {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

const forward = normalize(sub(TARGET, EYE));
const right = normalize(cross(forward, { x: 0, y: 1, z: 0 }));
const up = cross(right, forward);

// Perspective-projects a world point (x,y,z) into canvas pixels, plus a `scale`
// factor (size falloff with depth) callers can reuse for beam-width shading.
// Returns null if the point is behind the camera (nothing sane to draw there).
export function project3d(x: number, y: number, z: number, w: number, h: number): (Point & { scale: number }) | null {
  const rel = sub({ x, y, z }, EYE);
  const camX = dot(rel, right);
  const camY = dot(rel, up);
  const camZ = dot(rel, forward);
  if (camZ < 0.05) return null;
  const half = (Math.min(w, h) / 2) * 0.9;
  const scale = FOCAL / camZ;
  return { x: w / 2 + camX * scale * half, y: h / 2 - camY * scale * half, scale };
}
