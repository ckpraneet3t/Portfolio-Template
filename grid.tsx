"use client";

import { useEffect, useRef } from "react";

// --- Configuration Constants ---
const CONFIG = {
  // Field vector settings
  VECTOR_COLOR: "rgba(128, 128, 128, 0.16)", // slightly fainter
  GRID_SPACING: 28, // Distance between vectors
  VECTOR_LENGTH: 5,

  // Particle settings (reduced for performance)
  PARTICLE_COLOR: "rgba(0, 200, 255, 0.72)",
  PARTICLE_COUNT: 200, // lowered further for smoother performance
  PARTICLE_SPEED: 1,
  PARTICLE_RADIUS: 0.65,

  // Noise field settings
  NOISE_SCALE: 0.009,
  NOISE_EVOLUTION_SPEED: 0.00045,

  // Attention (transformer) visualization
  ATTENTION_TARGET_COUNT: 6,
  ATTENTION_DURATION: 700,
  ATTENTION_COOLDOWN_MS: 60, // faster feedback when hovering
  ATTENTION_LINE_WIDTH: 1.6,
  ATTENTION_COLOR: "rgba(0,255,230,1)",
  ATTENTION_GLOW_BLUR: 26,
  ATTENTION_MAX_LINES: 300,
  ATTENTION_ACTIVATE_DISTANCE: 80, // easier to trigger from farther away

  // Performance/visual tuning
  BACKGROUND_DIM_ALPHA: 0.18, // light dim so attention shows up but background still visible
  DRAW_VECTORS_EVERY_N_FRAMES: 8, // draw vector arrows less frequently
  UPDATE_FIELD_EVERY_N_FRAMES: 5,
};

// --- Perlin Noise Generator (same as before) ---
class PerlinNoiseGenerator {
  private p: Uint8Array = new Uint8Array(512);

  constructor() {
    this.init();
  }

  public init() {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) this.p[i] = p[i & 255];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  public noise(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);
    const A = this.p[X] + Y,
      AA = this.p[A] + Z,
      AB = this.p[A + 1] + Z;
    const B = this.p[X + 1] + Y,
      BA = this.p[B] + Z,
      BB = this.p[B + 1] + Z;
    return (
      this.lerp(
        w,
        this.lerp(
          v,
          this.lerp(u, this.grad(this.p[AA], x, y), this.grad(this.p[BA], x - 1, y)),
          this.lerp(u, this.grad(this.p[AB], x, y - 1), this.grad(this.p[BB], x - 1, y - 1))
        ),
        this.lerp(
          v,
          this.lerp(u, this.grad(this.p[AA + 1], x, y), this.grad(this.p[BA + 1], x - 1, y)),
          this.lerp(u, this.grad(this.p[AB + 1], x, y - 1), this.grad(this.p[BB + 1], x - 1, y - 1))
        )
      )
    );
  }
}

const perlinNoise = new PerlinNoiseGenerator();

// --- Particle Class ---
class Particle {
  x: number;
  y: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
  }

  update(getAngleNear: (x: number, y: number) => number) {
    const angle = getAngleNear(this.x, this.y);
    const vx = Math.cos(angle) * CONFIG.PARTICLE_SPEED;
    const vy = Math.sin(angle) * CONFIG.PARTICLE_SPEED;
    this.x += vx;
    this.y += vy;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, CONFIG.PARTICLE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = CONFIG.PARTICLE_COLOR;
    ctx.fill();
  }

  reset(canvasWidth: number, canvasHeight: number) {
    if (this.x < -10 || this.x > canvasWidth + 10 || this.y < -10 || this.y > canvasHeight + 10) {
      this.x = Math.random() * canvasWidth;
      this.y = Math.random() * canvasHeight;
    }
  }
}

// --- Attention line type ---
type Node = { x: number; y: number };
type AttentionLine = {
  from: Node;
  to: Node;
  start: number; // ms
  duration: number; // ms
};

export default function Grid() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const particles = useRef<Particle[]>([]);
  const nodes = useRef<Node[]>([]);
  const attentionLines = useRef<AttentionLine[]>([]);
  const lastActivation = useRef<number>(0);
  const mouse = useRef<{ x: number; y: number } | null>(null);

  // Performance helpers
  const gridAngles = useRef<number[]>([]);
  const colsRef = useRef<number>(0);
  const rowsRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let frame = 0;

    const setup = () => {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const { innerWidth, innerHeight } = window;
      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;

      ctx.resetTransform();
      ctx.scale(dpr, dpr);

      // Particles
      particles.current = [];
      for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
        particles.current.push(new Particle(innerWidth, innerHeight));
      }

      // Precompute grid nodes (in CSS pixels)
      nodes.current = [];
      const cols = Math.ceil(innerWidth / CONFIG.GRID_SPACING) + 1;
      const rows = Math.ceil(innerHeight / CONFIG.GRID_SPACING) + 1;
      colsRef.current = cols;
      rowsRef.current = rows;

      for (let gx = 0; gx < cols; gx++) {
        for (let gy = 0; gy < rows; gy++) {
          nodes.current.push({ x: gx * CONFIG.GRID_SPACING, y: gy * CONFIG.GRID_SPACING });
        }
      }

      gridAngles.current = new Array(nodes.current.length).fill(0);

      attentionLines.current = attentionLines.current.filter(line => line.start + line.duration > performance.now());
    };

    const recomputeGridAngles = (frameNum: number) => {
      const t = frameNum * CONFIG.NOISE_EVOLUTION_SPEED;
      for (let i = 0; i < nodes.current.length; i++) {
        const n = nodes.current[i];
        gridAngles.current[i] = perlinNoise.noise(n.x * CONFIG.NOISE_SCALE, n.y * CONFIG.NOISE_SCALE, t) * Math.PI * 2;
      }
    };

    const getAngleNearestNode = (x: number, y: number) => {
      const gx = Math.round(x / CONFIG.GRID_SPACING);
      const gy = Math.round(y / CONFIG.GRID_SPACING);
      const cols = colsRef.current;
      const rows = rowsRef.current;
      const ix = Math.min(Math.max(gx, 0), cols - 1);
      const iy = Math.min(Math.max(gy, 0), rows - 1);
      const idx = iy + ix * rows;
      const angle = gridAngles.current[idx] ?? 0;
      return angle;
    };

    const spawnAttentionFromNearest = (mx: number, my: number) => {
      const now = performance.now();
      if (now - lastActivation.current < CONFIG.ATTENTION_COOLDOWN_MS) return;
      lastActivation.current = now;

      const gx = Math.round(mx / CONFIG.GRID_SPACING);
      const gy = Math.round(my / CONFIG.GRID_SPACING);
      const cols = colsRef.current;
      const rows = rowsRef.current;
      if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) return;
      const idx = gy + gx * rows;
      const nearest = nodes.current[idx];
      if (!nearest) return;

      const d = Math.hypot(nearest.x - mx, nearest.y - my);
      if (d > CONFIG.ATTENTION_ACTIVATE_DISTANCE) return;

      const possible = nodes.current.length;
      const targets: Node[] = [];
      const triesLimit = CONFIG.ATTENTION_TARGET_COUNT * 8;
      let tries = 0;
      while (targets.length < CONFIG.ATTENTION_TARGET_COUNT && tries < triesLimit) {
        const idx2 = Math.floor(Math.random() * possible);
        const candidate = nodes.current[idx2];
        if (candidate === nearest) {
          tries++;
          continue;
        }
        if (!targets.includes(candidate)) targets.push(candidate);
        tries++;
      }

      for (const t of targets) {
        if (attentionLines.current.length >= CONFIG.ATTENTION_MAX_LINES) break;
        attentionLines.current.push({ from: nearest, to: t, start: now, duration: CONFIG.ATTENTION_DURATION });
      }
    };

    const drawVectors = (ctx: CanvasRenderingContext2D) => {
      ctx.strokeStyle = CONFIG.VECTOR_COLOR;
      ctx.lineWidth = 1;
      const cols = colsRef.current;
      const rows = rowsRef.current;
      for (let gx = 0; gx < cols; gx++) {
        for (let gy = 0; gy < rows; gy++) {
          const idx = gy + gx * rows;
          const n = nodes.current[idx];
          if (!n) continue;
          const angle = gridAngles.current[idx] ?? 0;
          ctx.save();
          ctx.translate(n.x, n.y);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(-CONFIG.VECTOR_LENGTH / 2, 0);
          ctx.lineTo(CONFIG.VECTOR_LENGTH / 2, 0);
          ctx.stroke();
          ctx.restore();
        }
      }
    };

    const animate = () => {
      const { innerWidth, innerHeight } = window;

      // clear and lightly dim background so attention pops without being too dark
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.fillStyle = `rgba(0,0,0,${CONFIG.BACKGROUND_DIM_ALPHA})`;
      ctx.fillRect(0, 0, innerWidth, innerHeight);

      if (frame % CONFIG.UPDATE_FIELD_EVERY_N_FRAMES === 0) recomputeGridAngles(frame);

      if (frame % CONFIG.DRAW_VECTORS_EVERY_N_FRAMES === 0) {
        drawVectors(ctx);
      }

      particles.current.forEach(p => {
        p.update(getAngleNearestNode);
        p.draw(ctx);
        p.reset(innerWidth, innerHeight);
      });

      const now = performance.now();
      ctx.save();
      ctx.globalCompositeOperation = "lighter" as GlobalCompositeOperation;

      for (let i = attentionLines.current.length - 1; i >= 0; i--) {
        const al = attentionLines.current[i];
        const t = (now - al.start) / al.duration;
        if (t >= 1) {
          attentionLines.current.splice(i, 1);
          continue;
        }

        const ease = 1 - Math.pow(1 - t, 3);
        const alpha = 1 - ease;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.lineWidth = CONFIG.ATTENTION_LINE_WIDTH;
        ctx.strokeStyle = CONFIG.ATTENTION_COLOR;
        ctx.shadowBlur = CONFIG.ATTENTION_GLOW_BLUR * (1 - t);
        ctx.beginPath();
        ctx.moveTo(al.from.x, al.from.y);
        ctx.lineTo(al.to.x, al.to.y);
        ctx.stroke();

        const sx = al.from.x + (al.to.x - al.from.x) * ease;
        const sy = al.from.y + (al.to.y - al.from.y) * ease;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = CONFIG.ATTENTION_COLOR;
        ctx.fill();

        ctx.restore();
      }

      ctx.restore();

      frame++;
      animationFrameId.current = requestAnimationFrame(animate);
    };

    setup();
    recomputeGridAngles(0);
    perlinNoise.init();
    animate();

    let resizeTimeout: number;
    const onPointerMove = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = ev.clientX - rect.left;
      const my = ev.clientY - rect.top;
      mouse.current = { x: mx, y: my };
      spawnAttentionFromNearest(mx, my);
    };
    const onPointerLeave = () => {
      mouse.current = null;
    };

    // Listen on window so canvas can remain pointer-events-none (won't block UI)
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);

    const onResize = () => {
      window.clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(setup, 120);
    };

    window.addEventListener("resize", onResize);

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("resize", onResize);
      window.clearTimeout(resizeTimeout);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
