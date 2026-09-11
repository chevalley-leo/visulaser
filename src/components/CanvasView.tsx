import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { canvasToWorld, worldToCanvas } from "../coords";
import { FIXTURE, project3d, Z_FAR, Z_NEAR } from "../camera3d";
import { evaluateObjectAtTime } from "../animation";
import { toLaserPoints } from "../render/toLaserPoints";
import {
  createCircleObject,
  createLineObject,
  createPointObject,
  createPolygonObject,
  createRectObject,
  getWorldPoints,
  hitTest,
} from "../shapes";
import type { Point } from "../types";

const HIT_THRESHOLD = 0.04;

export function CanvasView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });

  const scene = useStore((s) => s.scene);
  const selectedId = useStore((s) => s.selectedId);
  const tool = useStore((s) => s.tool);
  const previewMode = useStore((s) => s.previewMode);
  const currentTime = useStore((s) => s.currentTime);
  const addObject = useStore((s) => s.addObject);
  const updateObject = useStore((s) => s.updateObject);
  const selectObject = useStore((s) => s.selectObject);
  const removeObject = useStore((s) => s.removeObject);

  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [dragEnd, setDragEnd] = useState<Point | null>(null);
  const [polygonPts, setPolygonPts] = useState<Point[]>([]);
  const [movingOffset, setMovingOffset] = useState<Point | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" && tool === "polygon" && polygonPts.length >= 3) {
        addObject(createPolygonObject(polygonPts));
        setPolygonPts([]);
        setDragEnd(null);
      } else if (e.key === "Escape") {
        setPolygonPts([]);
        setDragEnd(null);
        setDragStart(null);
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        removeObject(selectedId);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tool, polygonPts, selectedId, addObject, removeObject]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(ctx);
  });

  function draw(ctx: CanvasRenderingContext2D) {
    const { w, h } = size;
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, w, h);

    // center axes — hidden in Beam/ILDA preview, they read as a blueprint grid, not haze
    if (previewMode === "2d") {
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.stroke();
    }

    if (previewMode === "ilda") {
      drawIldaPreview(ctx, w, h);
      return;
    }

    if (previewMode === "beam") drawFixtureMarker(ctx, w, h);

    for (const obj of scene.objects) {
      if (!obj.visible) continue;
      // ponytail: editing (drag/properties) always targets the rest-pose values on `obj`,
      // only the drawn position is animated — fine until we need to nudge a moving object mid-scrub.
      const animated = evaluateObjectAtTime(obj, currentTime);
      if (!animated.visible) continue; // outside its timeline block (activeRange)
      const world = getWorldPoints(animated);
      const isBeam = world.length === 2 && !animated.closed;
      let pts: Point[] | null;
      if (previewMode === "beam") {
        pts = projectBeamPoints(world, animated.closed, w, h);
      } else if (previewMode === "2d" && isBeam) {
        // 2D preview looks straight down the fixture's own axis (same
        // viewpoint as the projector) — a ray pointed away from you collapses
        // to the single point it aims at, not a line; only Beam Preview
        // (seen from the side/below) shows its actual length.
        pts = [worldToCanvas(world[1], w, h)];
      } else {
        pts = world.map((p) => worldToCanvas(p, w, h));
      }
      if (!pts) continue; // whole shape fell behind the audience camera
      drawPath(ctx, pts, animated.closed, animated.color, animated.intensity, obj.id === selectedId, false, animated.shapeType === "points");
    }

    if (dragStart && dragEnd && tool !== "polygon") {
      const preview = buildPreviewObject(tool, dragStart, dragEnd);
      if (preview) {
        const pts = getWorldPoints(preview).map((p) => worldToCanvas(p, w, h));
        drawPath(ctx, pts, preview.closed, { r: 255, g: 255, b: 255 }, 0.5, false, true);
      }
    }

    if (tool === "polygon" && polygonPts.length > 0) {
      const pts = polygonPts.map((p) => worldToCanvas(p, w, h));
      if (dragEnd) pts.push(worldToCanvas(dragEnd, w, h));
      drawPath(ctx, pts, false, { r: 255, g: 255, b: 255 }, 0.5, false, true);
      for (const p of pts) {
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Draws exactly what toLaserPoints computed for the DAC — lit segments in
  // color, blanked travel as a faint dashed guide — so this view validates the
  // real render pipeline (resampling density, blanking, ordering) instead of
  // a separate mock.
  function drawIldaPreview(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const points = toLaserPoints(scene, currentTime);
    let prev: Point | null = null;
    for (const p of points) {
      const cp = worldToCanvas(p, w, h);
      if (prev) {
        const prevCp = worldToCanvas(prev, w, h);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(prevCp.x, prevCp.y);
        ctx.lineTo(cp.x, cp.y);
        if (p.blanking) {
          ctx.strokeStyle = "rgba(255,255,255,0.15)";
          ctx.setLineDash([2, 3]);
          ctx.lineWidth = 1;
        } else {
          ctx.strokeStyle = `rgba(${p.r},${p.g},${p.b},${Math.max(0.15, p.intensity)})`;
          ctx.shadowColor = `rgb(${p.r},${p.g},${p.b})`;
          ctx.shadowBlur = 4;
          ctx.lineWidth = 2;
        }
        ctx.stroke();
        ctx.restore();
      }
      if (!p.blanking) {
        ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${Math.max(0.3, p.intensity)})`;
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      prev = p;
    }
    ctx.fillStyle = "#888";
    ctx.font = "11px sans-serif";
    ctx.fillText(`${points.length} points`, 8, 14);
  }

  // Beam Preview's camera: audience standing low and pulled back, looking up
  // at the beam field, instead of the flat "wall" projection. A 2-point open
  // segment is a physical beam — it always leaves the single shared FIXTURE
  // point (not its own object-local start, which the scene layout may have
  // scattered around to avoid overlap on the wall) and lands on the Z_FAR
  // "wall" plane; anything else is a flat shape sitting on that same plane.
  function projectBeamPoints(world: Point[], closed: boolean, w: number, h: number): Point[] | null {
    const isBeam = world.length === 2 && !closed;
    const pts: Point[] = [];
    for (let i = 0; i < world.length; i++) {
      const wp = isBeam && i === 0 ? FIXTURE : world[i];
      const z = isBeam && i === 0 ? Z_NEAR : Z_FAR;
      const p = project3d(wp.x, wp.y, z, w, h);
      if (!p) return null;
      pts.push(p);
    }
    return pts;
  }

  // A small bright marker at the fixture itself, so the audience view reads
  // as "beam leaving a point" rather than just a fan with no visible source.
  function drawFixtureMarker(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const p = project3d(FIXTURE.x, FIXTURE.y, Z_NEAR, w, h);
    if (!p) return;
    ctx.save();
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPath(
    ctx: CanvasRenderingContext2D,
    pts: Point[],
    closed: boolean,
    color: { r: number; g: number; b: number },
    intensity: number,
    selected: boolean,
    dashed = false,
    scatter = false,
  ) {
    if (pts.length === 0) return;
    const beamMode = previewMode === "beam" && !dashed;

    if (scatter) {
      // Particle cloud: independent dots, not a connected path.
      ctx.save();
      ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},${Math.max(0.15, intensity)})`;
      ctx.shadowColor = `rgb(${color.r},${color.g},${color.b})`;
      ctx.shadowBlur = 6 * intensity;
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else if (beamMode && pts.length === 2 && !closed) {
      // A single beam segment (fan/radial/sweep spoke): rendered as a cone that
      // widens away from its origin, like a shaft of light opening up in fog,
      // instead of a flat vector line.
      drawBeamCone(ctx, pts[0], pts[1], color, intensity);
    } else {
      ctx.save();
      if (dashed) ctx.setLineDash([5, 5]);
      if (beamMode) ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},${Math.max(0.15, intensity)})`;
      ctx.lineWidth = beamMode ? 3 : 2;
      ctx.shadowColor = `rgb(${color.r},${color.g},${color.b})`;
      ctx.shadowBlur = (beamMode ? 25 : 6) * intensity;
      if (pts.length === 1) {
        ctx.fillStyle = ctx.strokeStyle;
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
        if (closed) ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    }

    if (selected) {
      ctx.save();
      ctx.strokeStyle = "#00aaff";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      const minX = Math.min(...xs) - 6;
      const maxX = Math.max(...xs) + 6;
      const minY = Math.min(...ys) - 6;
      const maxY = Math.max(...ys) + 6;
      ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
      ctx.restore();
    }
  }

  // ponytail: fake volumetric cone (gradient-filled quad + bright core line), not a real
  // 3D/perspective camera — good enough to read as "a beam through haze", upgrade to an
  // actual viewer-perspective projection if a flat top-down feel is still not enough.
  function drawBeamCone(
    ctx: CanvasRenderingContext2D,
    p0: Point,
    p1: Point,
    color: { r: number; g: number; b: number },
    intensity: number,
  ) {
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const nearScale = (p0 as Point & { scale?: number }).scale ?? 1;
    const farScale = (p1 as Point & { scale?: number }).scale ?? 1;
    const nearHalf = 1 * nearScale;
    const farHalf = 16 * Math.max(0.2, intensity) * farScale;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    ctx.beginPath();
    ctx.moveTo(p0.x + nx * nearHalf, p0.y + ny * nearHalf);
    ctx.lineTo(p1.x + nx * farHalf, p1.y + ny * farHalf);
    ctx.lineTo(p1.x - nx * farHalf, p1.y - ny * farHalf);
    ctx.lineTo(p0.x - nx * nearHalf, p0.y - ny * nearHalf);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
    gradient.addColorStop(0, `rgba(${color.r},${color.g},${color.b},${0.85 * intensity})`);
    gradient.addColorStop(1, `rgba(${color.r},${color.g},${color.b},0)`);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = `rgba(255,255,255,${0.6 * intensity})`;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = `rgb(${color.r},${color.g},${color.b})`;
    ctx.shadowBlur = 20 * intensity;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    ctx.restore();
  }

  function buildPreviewObject(t: string, a: Point, b: Point) {
    if (t === "line") return createLineObject(a, b);
    if (t === "rect") return createRectObject(a, b);
    if (t === "circle") return createCircleObject(a, b);
    return null;
  }

  function eventToWorld(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = canvasRef.current!.getBoundingClientRect();
    const cp = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    return canvasToWorld(cp, size.w, size.h);
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const world = eventToWorld(e);
    if (tool === "select") {
      const hit = [...scene.objects].reverse().find((o) => o.visible && hitTest(o, world, HIT_THRESHOLD));
      if (hit) {
        selectObject(hit.id);
        setMovingOffset({ x: world.x - hit.x, y: world.y - hit.y });
      } else {
        selectObject(null);
      }
    } else if (tool === "point") {
      addObject(createPointObject(world));
    } else if (tool === "line" || tool === "rect" || tool === "circle") {
      setDragStart(world);
      setDragEnd(world);
    } else if (tool === "polygon") {
      setPolygonPts((prev) => [...prev, world]);
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const world = eventToWorld(e);
    if (movingOffset && selectedId) {
      updateObject(selectedId, { x: world.x - movingOffset.x, y: world.y - movingOffset.y });
    } else if (dragStart) {
      setDragEnd(world);
    } else if (tool === "polygon" && polygonPts.length > 0) {
      setDragEnd(world);
    }
  }

  function onPointerUp() {
    if (movingOffset) {
      setMovingOffset(null);
      return;
    }
    if (dragStart && dragEnd) {
      const obj = buildPreviewObject(tool, dragStart, dragEnd);
      if (obj) addObject(obj);
      setDragStart(null);
      setDragEnd(null);
    }
  }

  function onDoubleClick() {
    if (tool === "polygon" && polygonPts.length >= 3) {
      addObject(createPolygonObject(polygonPts));
      setPolygonPts([]);
      setDragEnd(null);
    }
  }

  return (
    <div ref={containerRef} className="canvas-view">
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={onDoubleClick}
      />
    </div>
  );
}
