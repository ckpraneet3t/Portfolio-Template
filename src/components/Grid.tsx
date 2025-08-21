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
  // MODIFIED: Base values for dots when not affected by the mouse
  GRID_POINT_RADIUS: 0.8,
  GRID_POINT_COLOR_RGB: "0,0,0",
  GRID_POINT_OPACITY: 0.4,
  DPR_LIMIT: 1.2,
  // ADDED: Configuration for the mouse "glow" or "lens" effect
  MOUSE_EFFECT_RADIUS: 150, // The radius of the effect around the cursor
  MOUSE_EFFECT_MAX_POINT_RADIUS: 2.5, // The max size a point can grow to
  MOUSE_EFFECT_MAX_OPACITY: 0.98, // The max opacity a point can have
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

    // MODIFIED: The drawing function now creates a "glow" or "lens" effect
    function drawStaticGrid() {
      bgCtx.clearRect(0, 0, w, h);
      const { x: mouseX, y: mouseY } = mousePos.current;

      for (let y = 0; y < h; y += CFG.GRID_SPACING) {
        for (let x = 0; x < w; x += CFG.GRID_SPACING) {
          const jitter = Math.sin(x * 0.013 + y * 0.011) * 0.4;
          const finalX = x + jitter;
          const finalY = y;

          // ADDED: Mouse "glow" / "lens" logic
          const dx = finalX - mouseX;
          const dy = finalY - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let radius = CFG.GRID_POINT_RADIUS;
          let opacity = CFG.GRID_POINT_OPACITY;

          if (dist < CFG.MOUSE_EFFECT_RADIUS) {
            // Proximity is 1 when mouse is on the point, 0 at the edge
            const proximity = 1 - dist / CFG.MOUSE_EFFECT_RADIUS;
            const smoothedProximity = proximity * proximity; // Ease-in for a smoother falloff

            radius = CFG.GRID_POINT_RADIUS + smoothedProximity * (CFG.MOUSE_EFFECT_MAX_POINT_RADIUS - CFG.GRID_POINT_RADIUS);
            opacity = CFG.GRID_POINT_OPACITY + smoothedProximity * (CFG.MOUSE_EFFECT_MAX_OPACITY - CFG.GRID_POINT_OPACITY);
          }

          bgCtx.fillStyle = `rgba(${CFG.GRID_POINT_COLOR_RGB}, ${opacity})`;
          bgCtx.beginPath();
          bgCtx.arc(finalX, finalY, radius, 0, Math.PI * 2);
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