import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import { canvasToWorld, worldToCanvas } from "../coords";
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

    // center axes
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();

    for (const obj of scene.objects) {
      if (!obj.visible) continue;
      const pts = getWorldPoints(obj).map((p) => worldToCanvas(p, w, h));
      drawPath(ctx, pts, obj.closed, obj.color, obj.intensity, obj.id === selectedId);
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

  function drawPath(
    ctx: CanvasRenderingContext2D,
    pts: Point[],
    closed: boolean,
    color: { r: number; g: number; b: number },
    intensity: number,
    selected: boolean,
    dashed = false,
  ) {
    if (pts.length === 0) return;
    ctx.save();
    if (dashed) ctx.setLineDash([5, 5]);
    ctx.strokeStyle = `rgba(${color.r},${color.g},${color.b},${Math.max(0.15, intensity)})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = `rgb(${color.r},${color.g},${color.b})`;
    ctx.shadowBlur = 6 * intensity;
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
