"use client";

import { useEffect, useRef } from "react";

const CFG = {
  GRID_SPACING: 48,
  GRID_POINT_RADIUS: 0.8,
  GRID_POINT_COLOR_RGB: "0,0,0",
  GRID_POINT_OPACITY: 0.4,
  DPR_LIMIT: 1.2,
  MOUSE_EFFECT_RADIUS: 150,
  MOUSE_EFFECT_MAX_POINT_RADIUS: 2.5,
  MOUSE_EFFECT_MAX_OPACITY: 0.98,
};

// PRE-CALCULATED VALUES for efficiency
const MOUSE_EFFECT_RADIUS_SQ = CFG.MOUSE_EFFECT_RADIUS * CFG.MOUSE_EFFECT_RADIUS;
const UNAFFECTED_FILL_STYLE = `rgba(${CFG.GRID_POINT_COLOR_RGB}, ${CFG.GRID_POINT_OPACITY})`;

export default function MinimalTransparentGrid() {
  const bgRef = useRef<HTMLCanvasElement | null>(null);
  const mousePos = useRef({ x: -1000, y: -1000 });
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    const bgCanvas = bgRef.current;
    if (!bgCanvas) return;

    const bgCanvasEl = bgCanvas as HTMLCanvasElement;
    const bgCtx = bgCanvasEl.getContext("2d", { alpha: true });
    if (!bgCtx) return;

    let w = 0;
    let h = 0;
    let DPR = Math.min(window.devicePixelRatio || 1, CFG.DPR_LIMIT);

    function drawGrid() {
      if (!bgCtx) return;

      bgCtx.clearRect(0, 0, w, h);
      const { x: mouseX, y: mouseY } = mousePos.current;

      for (let y = 0; y < h; y += CFG.GRID_SPACING) {
        for (let x = 0; x < w; x += CFG.GRID_SPACING) {
          const jitter = Math.sin(x * 0.013 + y * 0.011) * 0.4;
          const finalX = x + jitter;
          const finalY = y;

          const dx = finalX - mouseX;
          const dy = finalY - mouseY;
          const distSq = dx * dx + dy * dy;

          if (distSq < MOUSE_EFFECT_RADIUS_SQ) {
            const dist = Math.sqrt(distSq);
            const proximity = 1 - dist / CFG.MOUSE_EFFECT_RADIUS;
            const smoothedProximity = proximity * proximity;

            const radius = CFG.GRID_POINT_RADIUS + smoothedProximity * (CFG.MOUSE_EFFECT_MAX_POINT_RADIUS - CFG.GRID_POINT_RADIUS);
            const opacity = CFG.GRID_POINT_OPACITY + smoothedProximity * (CFG.MOUSE_EFFECT_MAX_OPACITY - CFG.GRID_POINT_OPACITY);

            bgCtx.fillStyle = `rgba(${CFG.GRID_POINT_COLOR_RGB}, ${opacity})`;
            bgCtx.beginPath();
            bgCtx.arc(finalX, finalY, radius, 0, Math.PI * 2);
            bgCtx.fill();
          } else {
            bgCtx.fillStyle = UNAFFECTED_FILL_STYLE;
            bgCtx.beginPath();
            bgCtx.arc(finalX, finalY, CFG.GRID_POINT_RADIUS, 0, Math.PI * 2);
            bgCtx.fill();
          }
        }
      }
    }

    function animationLoop() {
      drawGrid();
      animationFrameId.current = null;
    }

    function onMouseMove(e: MouseEvent) {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (!animationFrameId.current) {
        animationFrameId.current = requestAnimationFrame(animationLoop);
      }
    }

    function onResize() {
      // FIXED: Add a null check here as well
      if (!bgCtx) return;

      DPR = Math.min(window.devicePixelRatio || 1, CFG.DPR_LIMIT);
      w = window.innerWidth;
      h = window.innerHeight;

      bgCanvasEl.width = Math.floor(w * DPR);
      bgCanvasEl.height = Math.floor(h * DPR);
      bgCanvasEl.style.width = `${w}px`;
      bgCanvasEl.style.height = `${h}px`;
      bgCtx.setTransform(DPR, 0, 0, DPR, 0, 0);

      drawGrid();
    }

    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMouseMove);
    onResize();

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
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