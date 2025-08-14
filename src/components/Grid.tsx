"use client";

import { useEffect, useRef } from "react";

export default function Grid() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const baseSpacingPx = 12;
    const minorRadius = 1.2;
    const majorEvery = 6;

    function buildTile(spacing: number, dprLocal: number) {
      const tileSize = Math.ceil(spacing * majorEvery);
      const tileW = Math.ceil(tileSize * dprLocal);
      const tileH = Math.ceil(tileSize * dprLocal);
      const tile = document.createElement("canvas");
      tile.width = tileW;
      tile.height = tileH;

      const tctx = tile.getContext("2d");
      if (!tctx) return null;

      tctx.clearRect(0, 0, tileW, tileH);
      tctx.save();
      tctx.scale(dprLocal, dprLocal);

      // Minor dots
      tctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      tctx.beginPath();
      for (let iy = 0; iy <= majorEvery; iy++) {
        for (let ix = 0; ix <= majorEvery; ix++) {
          const x = ix * spacing;
          const y = iy * spacing;
          tctx.moveTo(x + 0.1, y);
          tctx.arc(x, y, minorRadius, 0, Math.PI * 2);
        }
      }
      tctx.fill();

      // Grid lines
      tctx.strokeStyle = "rgba(98, 210, 251, 0.28)";
      tctx.lineWidth = 0.4;
      tctx.beginPath();
      for (let iy = 0; iy <= majorEvery; iy++) {
        const y = iy * spacing;
        tctx.moveTo(0, y + 0.5);
        tctx.lineTo(tileSize + 0.5, y + 0.5);
      }
      for (let ix = 0; ix <= majorEvery; ix++) {
        const x = ix * spacing;
        tctx.moveTo(x + 0.5, 0);
        tctx.lineTo(x + 0.5, tileSize + 0.5);
      }
      tctx.stroke();

      tctx.restore();
      return tile;
    }

    function drawStaticGrid() {
      if (!canvas || !ctx) return;

      const { innerWidth, innerHeight } = window;
      canvas.width = Math.floor(innerWidth * dpr);
      canvas.height = Math.floor(innerHeight * dpr);
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;

      const tile = buildTile(baseSpacingPx, dpr);
      if (tile) {
        const pattern = ctx.createPattern(tile, "repeat");
        if (pattern) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    drawStaticGrid();

    let resizeTimeout: number | null = null;
    function onResize() {
      if (resizeTimeout) window.clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        drawStaticGrid();
        resizeTimeout = null;
      }, 120);
    }

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-5"
    />
  );
}
