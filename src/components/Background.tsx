"use client";

import { useEffect, useRef } from 'react';
import Grid from './Grid';

export default function Background() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // refs to avoid re-allocating on every render
  const rafRef = useRef<number | null>(null);
  const offscreenGrainRef = useRef<HTMLCanvasElement | null>(null);
  const needRegenGrainRef = useRef(true);
  const frameCounterRef = useRef(0);
  const resizeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    function setCanvasSize() {
      const { innerWidth, innerHeight } = window;
      canvas.width = Math.floor(innerWidth * dpr);
      canvas.height = Math.floor(innerHeight * dpr);
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      needRegenGrainRef.current = true;
    }

    // debounce resize to avoid thrashing
    function onResize() {
      if (resizeTimeoutRef.current) window.clearTimeout(resizeTimeoutRef.current);
      // wait 120ms after resizing stops
      resizeTimeoutRef.current = window.setTimeout(() => {
        setCanvasSize();
        resizeTimeoutRef.current = null;
      }, 120);
    }

    setCanvasSize();
    window.addEventListener('resize', onResize);

    // pause animation when tab is hidden to save CPU
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        running = false;
      } else {
        if (!running) {
          running = true;
          rafRef.current = requestAnimationFrame(render);
        }
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    // deterministic-ish RNG (same as before)
    const seed = 1337;
    const rand = mulberry32(seed);


    function regenGrain(w: number, h: number) {
      const g = document.createElement('canvas');
      g.width = w;
      g.height = h;
      const gc = g.getContext('2d');
      if (!gc) return null;

      // fewer grains than before for speed but still visible
      const area = (w * h) / (dpr * dpr);
      const num = Math.floor(area * 0.000012); // tuned down
      const imageData = gc.createImageData(w, h);
      // To be fast, plot individual pixels into ImageData buffer
      for (let i = 0; i < num; i++) {
        const x = Math.floor(rand() * w);
        const y = Math.floor(rand() * h);
        const idx = (y * w + x) * 4;
        const shade = 230 + Math.floor(rand() * 14);
        imageData.data[idx] = shade;
        imageData.data[idx + 1] = shade;
        imageData.data[idx + 2] = shade;
        imageData.data[idx + 3] = 255; // solid on the offscreen
      }
      gc.putImageData(imageData, 0, 0);
      offscreenGrainRef.current = g;
      needRegenGrainRef.current = false;
    }

    function render(t: number) {
      if (!ctx || !canvasRef.current) return;
      if (document.visibilityState === 'hidden') {
        rafRef.current = null;
        running = false;
        return;
      }

      const w = canvas.width;
      const h = canvas.height;

      // Regenerate grain only when size changed
      if (needRegenGrainRef.current || !offscreenGrainRef.current) {
        regenGrain(w, h);
      }

      // soften the time scale for slow movement. If user prefers reduced motion we freeze.
      const time = prefersReducedMotion ? 0 : t * 0.000045;

      // update gradient only every 3 frames to reduce work
      frameCounterRef.current = (frameCounterRef.current + 1) % 4;
      if (frameCounterRef.current === 0) {
        const g = ctx.createLinearGradient(0, 0, w, h);
        const c1 = lerpColor([16, 18, 22], [12, 14, 18], (Math.sin(time) + 1) / 2);
        const c2 = lerpColor([10, 12, 15], [18, 20, 24], (Math.cos(time) + 1) / 2);
        g.addColorStop(0, `rgb(${c1.join(',')})`);
        g.addColorStop(1, `rgb(${c2.join(',')})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      } else {
        // On non-gradient frames we still clear with a semi-transparent rect to avoid artifacts
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.clearRect(0, 0, w, h);
      }

      // scanlines (draw infrequently and with bigger spacing to reduce fill ops)
      ctx.globalAlpha = 0.03;
      ctx.fillStyle = '#fff';
      const spacing = 6 * dpr; // increased spacing => fewer rects
      for (let y = 0; y < h; y += spacing) {
        ctx.fillRect(0, y, w, 1);
      }
      ctx.globalAlpha = 1;

      // subtle radial vignette for depth
      const gradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h) * 0.8);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.15)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // neural connections: fewer nodes and limited neighbor checks
      if (!prefersReducedMotion) {
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = 'rgba(45,225,242,0.32)';
        ctx.lineWidth = 1 * dpr;

        const nodes: Array<[number, number]> = [];
        const count = 26; // slightly more nodes for better visual density
        for (let i = 0; i < count; i++) {
          const nx = (Math.sin(time * 5.2 + i * 0.8) * 0.5 + 0.5) * w;
          const ny = (Math.cos(time * 3.8 + i * 1.1) * 0.5 + 0.5) * h;
          nodes.push([nx, ny]);
        }

        // sort by x so "nearby" nodes in array are spatially nearby (cheap neighbor limitation)
        const sorted = nodes.map((p, idx) => ({ p, idx })).sort((a, b) => a.p[0] - b.p[0]);
        const maxLookAhead = 5; // check only a handful of neighbors to reduce pairs
        const maxDist = Math.min(w, h) * 0.18;

        for (let i = 0; i < sorted.length; i++) {
          const [x1, y1] = sorted[i].p;
          for (let j = i + 1; j < Math.min(sorted.length, i + 1 + maxLookAhead); j++) {
            const [x2, y2] = sorted[j].p;
            const dx = x1 - x2, dy = y1 - y2;
            const dist = Math.hypot(dx, dy);
            if (dist < maxDist) {
              const a = 1 - dist / maxDist;
              ctx.globalAlpha = 0.095 * a;
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
            }
          }
        }
        ctx.globalAlpha = 1;
      }

      // draw precomputed grain canvas (fast drawImage op)
      if (offscreenGrainRef.current) {
        ctx.globalAlpha = 0.065; // slightly more visible grain
        ctx.drawImage(offscreenGrainRef.current, 0, 0, w, h);
        ctx.globalAlpha = 1;
      }

      // request next frame
      rafRef.current = requestAnimationFrame(render);
    }

    // start
    rafRef.current = requestAnimationFrame(render);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (resizeTimeoutRef.current) window.clearTimeout(resizeTimeoutRef.current);
    };
  }, [prefersReducedMotion]);

  return (
    <>
      <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 -z-10" />
      <Grid />
      <video
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-20 w-full h-full object-cover opacity-[0.08]"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="https://cdn.coverr.co/videos/coverr-particles-1574/1080p.mp4" type="video/mp4" />
      </video>
    </>
  );
}

function mulberry32(a: number) {
  return function() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lerpColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];
}
