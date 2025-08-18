"use client";

import { useEffect, useRef } from "react";

/**
 * RhythmicGrid — smoother, pulsing particle motion driven by a global beat.
 * - Single export, "use client" at top.
 * - Tune CFG to change tempo / strength / smoothness.
 */

const CFG = {
  GRID_SPACING: 36,
  GRID_POINT_RADIUS: 1.2,
  GRID_ALPHA: 0.16,

  RIPPLE_SCALE: 0.0016,

  PARTICLE_COUNT: 140,
  PARTICLE_SIZE: 1.2,
  PARTICLE_SPEED_LIMIT: 4.0,

  // spring to grid (gentle baseline restoring force)
  SPRING_K: 0.008,

  // continuous damping (used multiplicatively each frame for smoothness)
  DAMPING: 0.3,

  // inter-particle repulsion
  REPULSION_RADIUS: 18,
  REPULSION_STRENGTH: 0.03,

  HOVER_PARALLAX: 12,

  // Rhythm / beat params (tweak these)
  BPM: 30,                // beats per minute (tempo)
  BEAT_MAG: 0.8,          // strength of the pulse pushing particles outward
  BEAT_DECAY: 7.5,        // how quickly the pulse decays after each beat (higher = sharper hit)
  SYNCOPATION: 0.12,      // secondary offset pulse amplitude (creates off-beat feel)
  SWIRL: 0.65,            // how much the beat adds tangential (rotational) motion
  PHASE_VARIATION: 0.9,   // per-particle phase modulation of how they react to beats
  NOISE_STRENGTH: 0.06,   // tiny organic noise for character
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
  private fade(t: number) { return t * t * (3 - 2 * t); }
  private lerp(a: number, b: number, t: number) { return a + t * (b - a); }
  private grad(hash: number, x: number, y: number) {
    const h = hash & 3; const u = h < 2 ? x : y; const v = h < 2 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
  }
  noise(x: number, y: number) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const top = this.perm[this.perm[X] + Y], top1 = this.perm[this.perm[X + 1] + Y];
    const a = this.grad(top, xf, yf), b = this.grad(top1, xf - 1, yf);
    const u = this.fade(xf);
    return this.lerp(a, b, u) * 0.5;
  }
}
const NOISE = new SimpleNoise();

type Particle = {
  x: number; y: number;
  vx: number; vy: number;
  baseS: number; s: number;
  phase: number;      // per-particle phase to stagger beats
};

export default function RhythmicGrid() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const offGrid = useRef<HTMLCanvasElement | null>(null);
  const particles = useRef<Particle[]>([]);
  const pointer = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true }); if (!ctx) return;

    let raf: number | null = null;
    let w = window.innerWidth, h = window.innerHeight;
    let t0 = performance.now();

    const resize = () => {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      w = Math.max(1, window.innerWidth); h = Math.max(1, window.innerHeight);
      canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // bake crisp static grid to offscreen canvas
      const g = document.createElement("canvas");
      g.width = Math.floor(w * dpr); g.height = Math.floor(h * dpr);
      const gctx = g.getContext("2d");
      if (gctx) {
        gctx.scale(dpr, dpr); // draw in CSS px on offscreen
        gctx.clearRect(0, 0, w, h);
        gctx.fillStyle = `rgba(0,0,0,${CFG.GRID_ALPHA})`;
        for (let y = 0; y < h; y += CFG.GRID_SPACING) {
          for (let x = 0; x < w; x += CFG.GRID_SPACING) {
            gctx.beginPath(); gctx.arc(x, y, CFG.GRID_POINT_RADIUS, 0, Math.PI * 2); gctx.fill();
          }
        }
      }
      offGrid.current = g;
    };

    const initParticles = () => {
      particles.current = [];
      for (let i = 0; i < CFG.PARTICLE_COUNT; i++) {
        const px = Math.random() * w, py = Math.random() * h;
        const a = Math.random() * Math.PI * 2;
        const baseS = CFG.PARTICLE_SIZE * (0.7 + Math.random() * 1.1);
        const phase = Math.random() * Math.PI * 2;
        particles.current.push({ x: px, y: py, vx: Math.cos(a) * 0.6, vy: Math.sin(a) * 0.6, baseS, s: baseS, phase });
      }
    };

    const onMouseMove = (e: MouseEvent) => { pointer.current.x = e.clientX; pointer.current.y = e.clientY; pointer.current.active = true; };
    const onTouchMove = (e: TouchEvent) => { const t = e.touches[0]; if (!t) return; pointer.current.x = t.clientX; pointer.current.y = t.clientY; pointer.current.active = true; };
    const onLeave = () => { pointer.current.active = false; };

    // percussive envelope: fast attack at beat start, exponential decay
    const beatEnvelope = (t: number, bpm: number, decay: number, offset = 0) => {
      const hz = bpm / 60;
      const phase = (t * hz + offset) % 1; // [0..1)
      return Math.exp(-phase * decay);     // 1 at phase=0, decays toward 0
    };

    const draw = (now: number) => {
      const dt = Math.min(40, now - t0) / 1000; t0 = now;
      ctx.clearRect(0, 0, w, h);

      // draw static grid
      if (offGrid.current) ctx.drawImage(offGrid.current, 0, 0, w, h);

      const time = now * 0.001;
      const px = pointer.current.active ? ((pointer.current.x - w * 0.5) / w) * CFG.HOVER_PARALLAX : 0;
      const py = pointer.current.active ? ((pointer.current.y - h * 0.5) / h) * CFG.HOVER_PARALLAX : 0;

      // rhythmic envelopes
      const mainEnv = beatEnvelope(time, CFG.BPM, CFG.BEAT_DECAY, 0);
      const offEnv = beatEnvelope(time, CFG.BPM, CFG.BEAT_DECAY, 0.5) * CFG.SYNCOPATION;
      const beat = Math.max(0, mainEnv + offEnv); // combined pulse

      const P = particles.current;
      const step = dt * 60; // retain frame-rate normalization for simpler tuning

      for (let i = 0; i < P.length; i++) {
        const p = P[i];

        // nearest grid node baseline
        const gx = Math.round(p.x / CFG.GRID_SPACING) * CFG.GRID_SPACING;
        const gy = Math.round(p.y / CFG.GRID_SPACING) * CFG.GRID_SPACING;
        const dx = gx - p.x, dy = gy - p.y;

        // spring toward grid (gentle)
        let fx = dx * CFG.SPRING_K;
        let fy = dy * CFG.SPRING_K;

        // radial vector from node to particle (direction outward)
        let rx = p.x - gx, ry = p.y - gy;
        const rlen = Math.hypot(rx, ry) + 1e-6;
        rx /= rlen; ry /= rlen;

        // per-particle phase-modulated reaction to beat -> smooth stagger
        const phaseFactor = 1 + CFG.PHASE_VARIATION * Math.sin(p.phase + time * 2.0);

        // beat-driven outward push and tangential swirl
        const beatAmp = CFG.BEAT_MAG * beat * phaseFactor;
        fx += rx * beatAmp;
        fy += ry * beatAmp;

        // swirl/tangential component (rotational feel)
        const swirl = CFG.SWIRL * beat * phaseFactor;
        fx += -ry * swirl;
        fy += rx * swirl;

        // tiny Perlin noise nudges for organic smoothness
        const n = NOISE.noise(p.x * CFG.RIPPLE_SCALE + time * 0.6, p.y * CFG.RIPPLE_SCALE + time * 0.8);
        fx += Math.cos(n * Math.PI * 2) * CFG.NOISE_STRENGTH;
        fy += Math.sin(n * Math.PI * 2) * CFG.NOISE_STRENGTH;

        // neighbor repulsion (light)
        for (let j = 0; j < P.length; j++) {
          if (j === i) continue;
          const q = P[j];
          const rx2 = p.x - q.x, ry2 = p.y - q.y;
          const rsq = rx2 * rx2 + ry2 * ry2;
          const r2 = Math.sqrt(rsq) + 1e-6;
          if (r2 < CFG.REPULSION_RADIUS) {
            const rep = (1 - r2 / CFG.REPULSION_RADIUS) * CFG.REPULSION_STRENGTH;
            fx += (rx2 / r2) * rep;
            fy += (ry2 / r2) * rep;
          }
        }

        // integrate velocity with smoothing and damping for buttery motion
        p.vx = (p.vx + fx * step) * (1 - CFG.DAMPING * Math.min(1, step));
        p.vy = (p.vy + fy * step) * (1 - CFG.DAMPING * Math.min(1, step));

        // clamp speed to keep visuals stable (smooth cap)
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > CFG.PARTICLE_SPEED_LIMIT) {
          p.vx = (p.vx / sp) * CFG.PARTICLE_SPEED_LIMIT;
          p.vy = (p.vy / sp) * CFG.PARTICLE_SPEED_LIMIT;
        }

        p.x += p.vx * step;
        p.y += p.vy * step;

        // wrap edges gently
        if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20; else if (p.y > h + 20) p.y = -20;

        // size pulses with beat (smooth)
        p.s = p.baseS * (1 + 0.28 * beat * (0.8 + 0.6 * Math.sin(p.phase + time * 6)));
      }

      // draw particles
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < P.length; i++) {
        const p = P[i];
        // alpha slightly stronger on beat (makes pulses readable)
        const alpha = 0.6 + Math.min(0.4, beat * 0.9);
        ctx.beginPath(); ctx.globalAlpha = alpha; ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        ctx.arc(p.x + px, p.y + py, Math.max(0.6, p.s), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      }
      ctx.restore();

      // subtle dynamic grid overlay
      ctx.save(); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 0.06;
      for (let y = 0; y < h; y += CFG.GRID_SPACING) {
        for (let x = 0; x < w; x += CFG.GRID_SPACING) {
          const ox = NOISE.noise((x + time * 50) * CFG.RIPPLE_SCALE, (y + time * 40) * CFG.RIPPLE_SCALE) * 1.6;
          ctx.beginPath(); ctx.fillStyle = `rgba(0,0,0,0.08)`; ctx.arc(x + ox + px, y + ox + py, CFG.GRID_POINT_RADIUS, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();

      raf = requestAnimationFrame(draw);
    };

    // wire events
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true } as AddEventListenerOptions);
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("resize", resize);

    // init + run
    resize(); initParticles(); raf = requestAnimationFrame(draw);

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