import { evaluateObjectAtTime } from "../animation";
import { getWorldPoints } from "../shapes";
import type { LaserObject, LaserPoint, Point, RGB, Scene } from "../types";

export interface ToLaserPointsOptions {
  pointsPerSecond?: number; // DAC scan rate budget, typical ILDA DAC ≈ 30000pps
  targetFps?: number; // frame refresh the point budget is spread across
  blankingPoints?: number; // samples per blanked jump, lets the galvo settle before/after unblanking
  dwellPoints?: number; // repeated samples on a static point (particles) so persistence-of-vision reads it as lit
}

const DEFAULTS = { pointsPerSecond: 30_000, targetFps: 30, blankingPoints: 4, dwellPoints: 6 };

interface RenderItem {
  points: Point[];
  color: RGB;
  intensity: number;
}

function pathLength(pts: Point[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return len;
}

// A long straight segment covered by only its 2 vector endpoints would scan as
// a faint/dashed line on real hardware (the beam is only bright at sampled
// points) — resample so consecutive points are within maxSegmentLen.
function resamplePath(pts: Point[], closed: boolean, maxSegmentLen: number): Point[] {
  if (pts.length < 2) return pts;
  const path = closed ? [...pts, pts[0]] : pts;
  const out: Point[] = [path[0]];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / maxSegmentLen));
    for (let s = 1; s <= steps; s++) out.push({ x: a.x + (b.x - a.x) * (s / steps), y: a.y + (b.y - a.y) * (s / steps) });
  }
  return out;
}

// ponytail: greedy nearest-neighbor, not a real TSP solve — fine for the handful
// of items a scene has; revisit with a proper heuristic if shows get huge.
function orderByProximity(items: RenderItem[]): RenderItem[] {
  if (items.length <= 2) return items;
  const remaining = [...items];
  const ordered: RenderItem[] = [remaining.shift()!];
  while (remaining.length > 0) {
    const lastExit = ordered[ordered.length - 1].points.at(-1)!;
    let bestIdx = 0;
    let bestDist = Infinity;
    remaining.forEach((item, i) => {
      const d = Math.hypot(item.points[0].x - lastExit.x, item.points[0].y - lastExit.y);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });
    ordered.push(remaining.splice(bestIdx, 1)[0]);
  }
  return ordered;
}

function blankJump(from: Point, to: Point, count: number): LaserPoint[] {
  return Array.from({ length: count }, (_, i) => {
    const f = (i + 1) / count;
    return { x: from.x + (to.x - from.x) * f, y: from.y + (to.y - from.y) * f, r: 0, g: 0, b: 0, intensity: 0, blanking: true };
  });
}

// Converts the scene at time t into the flat point stream a real ILDA DAC would
// scan: resampled/blanked paths ordered to minimize dark travel between shapes.
// The preview ("ilda" mode in CanvasView) draws this exact output, so what you
// validate on screen is what would be sent to hardware — no separate mock.
export function toLaserPoints(scene: Scene, t: number, opts: ToLaserPointsOptions = {}): LaserPoint[] {
  const { pointsPerSecond, targetFps, blankingPoints, dwellPoints } = { ...DEFAULTS, ...opts };
  const pointBudget = pointsPerSecond / targetFps;

  const visible = scene.objects.map((o) => evaluateObjectAtTime(o, t)).filter((o) => o.visible);

  const shapeObjs: { obj: LaserObject; world: Point[] }[] = [];
  const dotObjs: { obj: LaserObject; world: Point[] }[] = [];
  for (const obj of visible) {
    const world = getWorldPoints(obj);
    if (world.length === 0) continue;
    (obj.shapeType === "points" || world.length === 1 ? dotObjs : shapeObjs).push({ obj, world });
  }

  const totalLen = shapeObjs.reduce((sum, { world, obj }) => sum + pathLength(obj.closed ? [...world, world[0]] : world), 0);
  const maxSegmentLen = totalLen > 0 ? totalLen / pointBudget : 0.05;

  const items: RenderItem[] = [
    ...shapeObjs.map(({ obj, world }) => ({
      points: resamplePath(world, obj.closed, maxSegmentLen),
      color: obj.color,
      intensity: obj.intensity,
    })),
    ...dotObjs.flatMap(({ obj, world }) =>
      world.map((p) => ({ points: Array.from({ length: dwellPoints }, () => p), color: obj.color, intensity: obj.intensity })),
    ),
  ];

  const ordered = orderByProximity(items);
  const out: LaserPoint[] = [];
  let cursor: Point | null = null;
  for (const item of ordered) {
    if (cursor) out.push(...blankJump(cursor, item.points[0], blankingPoints));
    for (const p of item.points) out.push({ x: p.x, y: p.y, r: item.color.r, g: item.color.g, b: item.color.b, intensity: item.intensity, blanking: false });
    cursor = item.points[item.points.length - 1];
  }
  return out;
}
