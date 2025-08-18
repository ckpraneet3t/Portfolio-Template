"use client";

import { useEffect, useRef } from "react";

/**
 * GentleSongGrid
 * - Smooth, continuous movement like ambient music
 * - No beats or pulses, just gentle flowing motion
 * - Particles drift in soft waves and currents
 */

const CFG = {
  GRID_SPACING: 36,
  GRID_POINT_RADIUS: 1.2,
  GRID_ALPHA: 0.14,

  RIPPLE_SCALE: 0.001,

  PARTICLE_COUNT: 110,
  PARTICLE_SIZE: 1.1,
  PARTICLE_SPEED_LIMIT: 1.8,

  // very gentle spring to grid
  SPRING_K: 0.003,

  // smooth continuous damping
  DAMPING: 0.08,

  // light repulsion to keep particles spread
  REPULSION_RADIUS: 16,
  REPULSION_STRENGTH: 0.02,

  HOVER_PARALLAX: 8,

  // continuous flow parameters
  FLOW_STRENGTH: 0.025,      // overall strength of flowing motion
  WAVE_AMPLITUDE: 0.035,     // how much particles sway in gentle waves
  DRIFT_SPEED: 0.15,         // speed of the invisible "current"
  WAVE_FREQUENCY: 0.3,       // frequency of the gentle waves
  BREATHING_AMPLITUDE: 0.18, // gentle size breathing
  BREATHING_SPEED: 0.4,      // speed of size changes

  // organic noise for natural feel
  NOISE_STRENGTH: 0.015,
  NOISE_SPEED: 0.08,
};

class SimpleNoise {
  private perm = new Uint8Array(512);
  constructor() {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }
  private fade(t: number) {
    return t * t * (3 - 2 * t);
  }
  private lerp(a: number, b: number, t: number) {
    return a + t * (b - a);
  }
  private grad(hash: number, x: number, y: number) {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
  }
  noise(x: number, y: number) {
    const X = Math.floor(x) & 255,
      Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x),
      yf = y - Math.floor(y);
    const top = this.perm[this.perm[X] + Y];
    const top1 = this.perm[this.perm[X + 1] + Y];
    const a = this.grad(top, xf, yf);
    const b = this.grad(top1, xf - 1, yf);
    const u = this.fade(xf);
    return this.lerp(a, b, u) * 0.5;
  }
}
const NOISE = new SimpleNoise();

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseS: number;
  s: number;
  flowPhase: number;    // for gentle wave motion
  breathPhase: number;  // for size breathing
};

export default function GentleSongGrid() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const offGrid = useRef<HTMLCanvasElement | null>(null);
  const particles = useRef<Particle[]>([]);
  const pointer = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf: number | null = null;
    let w = window.innerWidth;
    let h = window.innerHeight;
    let t0 = performance.now();

    const resize = () => {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      w = Math.max(1, window.innerWidth);
      h = Math.max(1, window.innerHeight);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // create soft static grid
      const g = document.createElement("canvas");
      g.width = Math.floor(w * dpr);
      g.height = Math.floor(h * dpr);
      const gctx = g.getContext("2d");
      if (gctx) {
        gctx.scale(dpr, dpr);
        gctx.clearRect(0, 0, w, h);
        gctx.fillStyle = `rgba(0,0,0,${CFG.GRID_ALPHA})`;
        for (let y = 0; y < h; y += CFG.GRID_SPACING) {
          for (let x = 0; x < w; x += CFG.GRID_SPACING) {
            gctx.beginPath();
            gctx.arc(x, y, CFG.GRID_POINT_RADIUS, 0, Math.PI * 2);
            gctx.fill();
          }
        }
      }
      offGrid.current = g;
    };

    const initParticles = () => {
      particles.current = [];
      for (let i = 0; i < CFG.PARTICLE_COUNT; i++) {
        const px = Math.random() * w;
        const py = Math.random() * h;
        const a = Math.random() * Math.PI * 2;
        const baseS = CFG.PARTICLE_SIZE * (0.75 + Math.random() * 0.8);
        const flowPhase = Math.random() * Math.PI * 2;
        const breathPhase = Math.random() * Math.PI * 2;
        particles.current.push({
          x: px,
          y: py,
          vx: Math.cos(a) * 0.2,
          vy: Math.sin(a) * 0.2,
          baseS,
          s: baseS,
          flowPhase,
          breathPhase,
        });
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      pointer.current.x = e.clientX;
      pointer.current.y = e.clientY;
      pointer.current.active = true;
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      pointer.current.x = t.clientX;
      pointer.current.y = t.clientY;
      pointer.current.active = true;
    };
    const onLeave = () => {
      pointer.current.active = false;
    };

    const draw = (now: number) => {
      const dt = Math.min(40, now - t0) / 1000;
      t0 = now;
      ctx.clearRect(0, 0, w, h);

      if (offGrid.current) ctx.drawImage(offGrid.current, 0, 0);

      const time = now * 0.001;
      const px = pointer.current.active ? ((pointer.current.x - w * 0.5) / w) * CFG.HOVER_PARALLAX : 0;
      const py = pointer.current.active ? ((pointer.current.y - h * 0.5) / h) * CFG.HOVER_PARALLAX : 0;

      const P = particles.current;
      const step = dt * 60;

      // global gentle wave motion across the entire field
      const globalWaveX = Math.sin(time * CFG.WAVE_FREQUENCY) * CFG.WAVE_AMPLITUDE;
      const globalWaveY = Math.cos(time * CFG.WAVE_FREQUENCY * 0.8 + 1.2) * CFG.WAVE_AMPLITUDE;

      for (let i = 0; i < P.length; i++) {
        const p = P[i];

        // slowly evolve phases for continuous motion
        p.flowPhase += CFG.DRIFT_SPEED * dt;
        p.breathPhase += CFG.BREATHING_SPEED * dt;

        // gentle spring toward nearest grid node
        const gx = Math.round(p.x / CFG.GRID_SPACING) * CFG.GRID_SPACING;
        const gy = Math.round(p.y / CFG.GRID_SPACING) * CFG.GRID_SPACING;
        const dx = gx - p.x;
        const dy = gy - p.y;
        let fx = dx * CFG.SPRING_K;
        let fy = dy * CFG.SPRING_K;

        // continuous flowing motion - each particle follows gentle sine waves
        const flowX = Math.sin(p.flowPhase + p.x * 0.008) * CFG.FLOW_STRENGTH;
        const flowY = Math.cos(p.flowPhase * 0.7 + p.y * 0.006 + 2.1) * CFG.FLOW_STRENGTH;
        fx += flowX;
        fy += flowY;

        // global wave influence
        fx += globalWaveX;
        fy += globalWaveY;

        // gentle cross-currents for more interesting motion
        const crossCurrent = Math.sin(time * 0.25 + (p.x + p.y) * 0.005) * CFG.FLOW_STRENGTH * 0.6;
        fx += crossCurrent * Math.cos(time * 0.18);
        fy += crossCurrent * Math.sin(time * 0.22);

        // organic perlin noise for natural micro-movements
        const n1 = NOISE.noise(p.x * CFG.RIPPLE_SCALE + time * CFG.NOISE_SPEED, p.y * CFG.RIPPLE_SCALE + time * CFG.NOISE_SPEED * 0.8);
        const n2 = NOISE.noise(p.x * CFG.RIPPLE_SCALE + time * CFG.NOISE_SPEED * 1.3 + 100, p.y * CFG.RIPPLE_SCALE + time * CFG.NOISE_SPEED * 0.9 + 200);
        fx += Math.cos(n1 * Math.PI * 2) * CFG.NOISE_STRENGTH;
        fy += Math.sin(n2 * Math.PI * 2) * CFG.NOISE_STRENGTH;

        // gentle inter-particle repulsion
        for (let j = 0; j < P.length; j++) {
          if (j === i) continue;
          const q = P[j];
          const rx = p.x - q.x;
          const ry = p.y - q.y;
          const rsq = rx * rx + ry * ry;
          const r = Math.sqrt(rsq) + 1e-6;
          if (r < CFG.REPULSION_RADIUS) {
            const rep = (1 - r / CFG.REPULSION_RADIUS) * CFG.REPULSION_STRENGTH;
            fx += (rx / r) * rep;
            fy += (ry / r) * rep;
          }
        }

        // integrate with smooth damping
        p.vx = (p.vx + fx * step) * (1 - CFG.DAMPING);
        p.vy = (p.vy + fy * step) * (1 - CFG.DAMPING);

        // gentle velocity limiting
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > CFG.PARTICLE_SPEED_LIMIT) {
          const factor = CFG.PARTICLE_SPEED_LIMIT / sp;
          p.vx *= factor;
          p.vy *= factor;
        }

        // update position
        p.x += p.vx * step;
        p.y += p.vy * step;

        // soft edge wrapping
        if (p.x < -20) p.x = w + 20;
        else if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        else if (p.y > h + 20) p.y = -20;

        // gentle breathing size variation
        const breathe = Math.sin(p.breathPhase) * CFG.BREATHING_AMPLITUDE;
        p.s = p.baseS * (1 + breathe);
      }

      // render particles with soft, continuous alpha variation
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < P.length; i++) {
        const p = P[i];
        // gentle alpha variation based on position and time
        const alphaVar = 0.6 + 0.3 * Math.sin(time * 0.5 + p.x * 0.01 + p.y * 0.008);
        ctx.beginPath();
        ctx.globalAlpha = alphaVar;
        ctx.fillStyle = `rgba(0,0,0,${alphaVar})`;
        ctx.arc(p.x + px, p.y + py, Math.max(0.4, p.s), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      // gentle animated grid overlay
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.05;
      for (let y = 0; y < h; y += CFG.GRID_SPACING) {
        for (let x = 0; x < w; x += CFG.GRID_SPACING) {
          const ox = NOISE.noise((x + time * 25) * CFG.RIPPLE_SCALE, (y + time * 20) * CFG.RIPPLE_SCALE) * 0.8;
          const oy = NOISE.noise((x + time * 18 + 500) * CFG.RIPPLE_SCALE, (y + time * 24 + 500) * CFG.RIPPLE_SCALE) * 0.6;
          ctx.beginPath();
          ctx.fillStyle = `rgba(0,0,0,0.06)`;
          ctx.arc(x + ox + px, y + oy + py, CFG.GRID_POINT_RADIUS, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();

      raf = requestAnimationFrame(draw);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true } as AddEventListenerOptions);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("resize", resize);

    resize();
    initParticles();
    raf = requestAnimationFrame(draw);

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove as EventListener);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-0" aria-hidden />;
}