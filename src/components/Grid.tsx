"use client";

import { useEffect, useRef } from "react";

/**
 * MinimalTransparentGrid — TS-safe
 * - Transparent background
 * - Static grid (drawn once, or on interaction)
 * - Minimal performance impact
 * - Fixes TypeScript 'possibly null' errors
 */

const CFG = {
  GRID_SPACING: 48,
  GRID_POINT_RADIUS: 0.9,
  GRID_POINT_COLOR: "rgba(0,0,0,0.98)",
  DPR_LIMIT: 1.2,
  // ADDED: Configuration for the mouse repulsion effect
  MOUSE_REPEL_RADIUS: 100, // The radius around the mouse where points are affected
  MOUSE_REPEL_STRENGTH: 0.5, // How strongly the points are pushed away
};

export default function MinimalTransparentGrid() {
  const bgRef = useRef<HTMLCanvasElement | null>(null);
  // ADDED: A ref to store the mouse position without causing re-renders
  const mousePos = useRef({ x: -1000, y: -1000 });

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

    // MODIFIED: The drawing function now accounts for the mouse position
    function drawStaticGrid() {
      bgCtx.clearRect(0, 0, w, h);
      bgCtx.fillStyle = CFG.GRID_POINT_COLOR;
      const { x: mouseX, y: mouseY } = mousePos.current;

      for (let y = 0; y < h; y += CFG.GRID_SPACING) {
        for (let x = 0; x < w; x += CFG.GRID_SPACING) {
          const jitter = Math.sin(x * 0.013 + y * 0.011) * 0.4;

          // ADDED: Mouse repulsion logic
          let finalX = x + jitter;
          let finalY = y;

          const dx = x - mouseX;
          const dy = y - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CFG.MOUSE_REPEL_RADIUS) {
            const force = (1 - dist / CFG.MOUSE_REPEL_RADIUS) * CFG.MOUSE_REPEL_STRENGTH;
            const angle = Math.atan2(dy, dx);
            finalX += Math.cos(angle) * force * CFG.GRID_SPACING;
            finalY += Math.sin(angle) * force * CFG.GRID_SPACING;
          }

          bgCtx.beginPath();
          bgCtx.arc(finalX, finalY, CFG.GRID_POINT_RADIUS, 0, Math.PI * 2);
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

    // ADDED: Mouse move handler to update position and redraw
    function onMouseMove(e: MouseEvent) {
      mousePos.current = { x: e.clientX, y: e.clientY };
      drawStaticGrid();
    }

    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMouseMove); // ADDED
    onResize();

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove); // ADDED
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