"use client";

import { useEffect, useRef } from "react";

/**
 * MinimalTransparentGrid — TS-safe
 * - Transparent background
 * - Static grid (drawn once)
 * - Minimal performance impact
 * - Fixes TypeScript 'possibly null' errors
 */

const CFG = {
  GRID_SPACING: 48,
  GRID_POINT_RADIUS: 0.9,
  GRID_POINT_COLOR: "rgba(0,0,0,0.98)",
  DPR_LIMIT: 1.2,
};

export default function MinimalTransparentGrid() {
  const bgRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const bgCanvas = bgRef.current;
    if (!bgCanvas) return;

    const bgCanvasEl = bgCanvas as HTMLCanvasElement;
    const bgCtxRaw = bgCanvasEl.getContext("2d");
    if (!bgCtxRaw) return;
    const bgCtx = bgCtxRaw as CanvasRenderingContext2D;

    let w = 0;
    let h = 0;
    let DPR = Math.min(window.devicePixelRatio || 1, CFG.DPR_LIMIT);

    function drawStaticGrid() {
      bgCtx.clearRect(0, 0, w, h);
      bgCtx.fillStyle = CFG.GRID_POINT_COLOR;
      for (let y = 0; y < h; y += CFG.GRID_SPACING) {
        for (let x = 0; x < w; x += CFG.GRID_SPACING) {
          const jitter = Math.sin(x * 0.013 + y * 0.011) * 0.4;
          bgCtx.beginPath();
          bgCtx.arc(x + jitter, y, CFG.GRID_POINT_RADIUS, 0, Math.PI * 2);
          bgCtx.fill();
        }
      }
    }

    function onResize() {
      DPR = Math.min(window.devicePixelRatio || 1, CFG.DPR_LIMIT);
      w = Math.max(1, window.innerWidth);
      h = Math.max(1, window.innerHeight);

      bgCanvasEl.width = Math.floor(w * DPR);
      bgCanvasEl.height = Math.floor(h * DPR);
      bgCanvasEl.style.width = `${w}px`;
      bgCanvasEl.style.height = `${h}px`;
      bgCtx.setTransform(DPR, 0, 0, DPR, 0, 0);

      drawStaticGrid();
    }

    window.addEventListener("resize", onResize);
    onResize();

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={bgRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden
    />
  );
}