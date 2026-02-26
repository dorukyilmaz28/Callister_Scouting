"use client";

import { useRef, useState, useCallback, useEffect } from "react";

export type Waypoint = { x: number; y: number };

const FIELD_ASPECT = 54 / 26; // FRC field ~54ft x 26ft
const WAYPOINT_R = 10;
const HIT_R = 18;

type Props = {
  waypoints: Waypoint[];
  onChange: (waypoints: Waypoint[]) => void;
  width?: number;
  height?: number;
  className?: string;
};

export function AutonomousRouteEditor({
  waypoints,
  onChange,
  width = 600,
  height = Math.round(600 / FIELD_ASPECT),
  className = "",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [size, setSize] = useState({ w: width, h: height });

  const getCanvas = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return null;
    const rect = c.getBoundingClientRect();
    return { canvas: c, ctx: c.getContext("2d"), rect };
  }, []);

  const clientToNorm = useCallback(
    (clientX: number, clientY: number): Waypoint | null => {
      const g = getCanvas();
      if (!g) return null;
      const { rect } = g;
      const x = (clientX - rect.left) / rect.width;
      const y = (clientY - rect.top) / rect.height;
      if (x < 0 || x > 1 || y < 0 || y > 1) return null;
      return { x, y };
    },
    [getCanvas]
  );

  const normToCanvas = useCallback(
    (x: number, y: number) => {
      const g = getCanvas();
      if (!g) return { px: 0, py: 0 };
      const { rect } = g;
      return {
        px: x * rect.width,
        py: y * rect.height,
      };
    },
    [getCanvas]
  );

  const hitTest = useCallback(
    (clientX: number, clientY: number): number => {
      const g = getCanvas();
      if (!g) return -1;
      const { rect } = g;
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      for (let i = waypoints.length - 1; i >= 0; i--) {
        const { px: wx, py: wy } = normToCanvas(waypoints[i].x, waypoints[i].y);
        const d = Math.hypot(px - wx, py - wy);
        if (d <= HIT_R) return i;
      }
      return -1;
    },
    [getCanvas, waypoints, normToCanvas]
  );

  const draw = useCallback(() => {
    const g = getCanvas();
    if (!g?.ctx) return;
    const { ctx, rect } = g;
    const rw = rect.width;
    const rh = rect.height;

    ctx.clearRect(0, 0, rw, rh);

    // Field background
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, rw, rh);
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, rw - 2, rh - 2);

    // Grid
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo((rw * i) / 4, 0);
      ctx.lineTo((rw * i) / 4, rh);
      ctx.stroke();
    }
    for (let i = 1; i < 2; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (rh * i) / 2);
      ctx.lineTo(rw, (rh * i) / 2);
      ctx.stroke();
    }

    // Path line
    if (waypoints.length >= 2) {
      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      const first = normToCanvas(waypoints[0].x, waypoints[0].y);
      ctx.moveTo(first.px, first.py);
      for (let i = 1; i < waypoints.length; i++) {
        const p = normToCanvas(waypoints[i].x, waypoints[i].y);
        ctx.lineTo(p.px, p.py);
      }
      ctx.stroke();
    }

    // Waypoints
    waypoints.forEach((wp, i) => {
      const { px, py } = normToCanvas(wp.x, wp.y);
      ctx.fillStyle = "#6366f1";
      ctx.beginPath();
      ctx.arc(px, py, WAYPOINT_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#e0e7ff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), px, py);
    });
  }, [getCanvas, waypoints, normToCanvas]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const onResize = () => {
      const rect = c.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) setSize({ w: rect.width, h: rect.height });
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(c);
    onResize();
    return () => ro.disconnect();
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const i = hitTest(e.clientX, e.clientY);
      if (i >= 0) {
        setDraggingIndex(i);
        (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
      } else {
        const pt = clientToNorm(e.clientX, e.clientY);
        if (pt) onChange([...waypoints, pt]);
      }
    },
    [hitTest, clientToNorm, waypoints, onChange]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (draggingIndex === null) return;
      const pt = clientToNorm(e.clientX, e.clientY);
      if (!pt) return;
      const next = [...waypoints];
      next[draggingIndex] = pt;
      onChange(next);
    },
    [draggingIndex, clientToNorm, waypoints, onChange]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (draggingIndex !== null) (e.target as HTMLCanvasElement).releasePointerCapture(e.pointerId);
      setDraggingIndex(null);
    },
    [draggingIndex]
  );

  const handleClear = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const handleRemoveLast = useCallback(() => {
    if (waypoints.length) onChange(waypoints.slice(0, -1));
  }, [waypoints, onChange]);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <p className="text-sm text-[#e0e7ff]/80">
        Sahaya tıklayarak rota noktaları ekleyin; noktaları sürükleyerek taşıyın.
      </p>
      <div className="relative overflow-hidden rounded-lg border border-[#475569] bg-[#0f172a]">
        <canvas
          ref={canvasRef}
          width={size.w}
          height={size.h}
          className="block w-full cursor-crosshair touch-none"
          style={{ aspectRatio: String(FIELD_ASPECT), maxHeight: 320 }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleRemoveLast}
          disabled={waypoints.length === 0}
          className="rounded-lg border border-[#475569] bg-[#1e293b] px-3 py-1.5 text-sm text-[#e0e7ff] disabled:opacity-50 hover:bg-[#334155]"
        >
          Son noktayı sil
        </button>
        <button
          type="button"
          onClick={handleClear}
          disabled={waypoints.length === 0}
          className="rounded-lg border border-[#475569] bg-[#1e293b] px-3 py-1.5 text-sm text-[#e0e7ff] disabled:opacity-50 hover:bg-[#334155]"
        >
          Rotayı temizle
        </button>
        {waypoints.length > 0 && (
          <span className="self-center text-xs text-[#94a3b8]">{waypoints.length} nokta</span>
        )}
      </div>
    </div>
  );
}
