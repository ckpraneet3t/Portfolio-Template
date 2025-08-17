"use client";

import { useEffect, useRef } from "react";

// --- Configuration Constants (aesthetic homepage cursor + scientific core) ---
const CONFIG = {
  // Field vector settings (black grid lines for a subtle, modern aesthetic)
  VECTOR_COLOR: "rgba(0,0,0,0.55)", // user requested black grids
  GRID_SPACING: 40, // slightly coarser to feel spacious on a homepage
  VECTOR_LENGTH: 6,

  // Particle settings (soft background activity)
  PARTICLE_COLOR: "rgba(70,180,220,0.20)",
  PARTICLE_COUNT: 50, // lighter for home page
  PARTICLE_SPEED: 0.72,
  PARTICLE_RADIUS: 0.7,

  // Noise field settings
  NOISE_SCALE: 0.01,
  NOISE_EVOLUTION_SPEED: 0.00028,

  // Attention (transformer) visualization — retained but subtler
  ATTENTION_TARGET_COUNT: 3,
  ATTENTION_DURATION: 700,
  ATTENTION_COOLDOWN_MS: 110,
  ATTENTION_BASE_LINE_WIDTH: 1.0,
  ATTENTION_GLOW_BLUR: 14, // softer, more aesthetic glow
  ATTENTION_MAX_LINES: 60,
  ATTENTION_ACTIVATE_DISTANCE: 110,
  ATTENTION_SAMPLE_POOL: 80,

  // Weight->color mapping (keep scientific cool->warm)
  COLOR_COOL: [70, 200, 180],
  COLOR_WARM: [255, 155, 70],

  // Labeling & debug
  SHOW_WEIGHT_LABELS: false, // disable on homepage to reduce clutter
  LABEL_FONT: "12px monospace",
  LABEL_COLOR: "rgba(255,255,255,0.95)",
  LABEL_BG: "rgba(0,0,0,0.55)",
  LABEL_OFFSET: 12,
  LABEL_MIN_WEIGHT: 0.6,

  // Smoothing / curve
  CURVE_STRENGTH: 0.22,

  // visual tuning / performance
  BACKGROUND_DIM_ALPHA: 0.06, // keep a gentle trail
  DRAW_VECTORS_EVERY_N_FRAMES: 6,
  UPDATE_FIELD_EVERY_N_FRAMES: 12,
  FPS_CAP: 45,

  // cursor halo (homepage friendly)
  CURSOR_RING_RADIUS: 14,
  CURSOR_RING_FADE: 0.22,
  CURSOR_SMOOTHING: 0.16,
};

// --- Perlin Noise Generator (scientific, unchanged) ---
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

// --- Particle Class (drawn as batched arcs) ---
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

  reset(canvasWidth: number, canvasHeight: number) {
    if (this.x < -10 || this.x > canvasWidth + 10 || this.y < -10 || this.y > canvasHeight + 10) {
      this.x = Math.random() * canvasWidth;
      this.y = Math.random() * canvasHeight;
    }
  }
}

// --- Types ---
type Node = { x: number; y: number };
type AttentionLine = { from: Node; to: Node; start: number; duration: number; weight: number };
type Halo = { x: number; y: number; start: number; duration: number; intensity: number };

function weightToRGB(w: number) {
  const min = 0.35;
  const max = 1.0;
  const t = Math.max(0, Math.min(1, (w - min) / (max - min)));
  const cool = CONFIG.COLOR_COOL;
  const warm = CONFIG.COLOR_WARM;
  const r = Math.round(cool[0] + (warm[0] - cool[0]) * t);
  const g = Math.round(cool[1] + (warm[1] - cool[1]) * t);
  const b = Math.round(cool[2] + (warm[2] - cool[2]) * t);
  return `${r},${g},${b}`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 4) {
  const min = Math.min(w, h) / 2;
  r = Math.min(r, min);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default function Grid() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const particles = useRef<Particle[]>([]);
  const nodes = useRef<Node[]>([]);
  const attentionLines = useRef<AttentionLine[]>([]);
  const halos = useRef<Halo[]>([]);
  const lastActivation = useRef<number>(0);

  const gridAngles = useRef<number[]>([]);
  const colsRef = useRef<number>(0);
  const rowsRef = useRef<number>(0);
  const lastFrameTime = useRef<number>(performance.now());

  // cursor smoothing state
  const cursorTarget = useRef<{ x: number; y: number } | null>(null);
  const cursorPos = useRef<{ x: number; y: number }>({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let frame = 0;
    let running = true;

    const setup = () => {
      const rawDpr = window.devicePixelRatio || 1;
      const dpr = Math.max(1, Math.min(1.25, rawDpr));
      const { innerWidth, innerHeight } = window;
      canvas.width = Math.round(innerWidth * dpr);
      canvas.height = Math.round(innerHeight * dpr);
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;

      ctx.resetTransform();
      ctx.scale(dpr, dpr);

      particles.current = [];
      for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) particles.current.push(new Particle(innerWidth, innerHeight));

      nodes.current = [];
      const cols = Math.ceil(innerWidth / CONFIG.GRID_SPACING) + 1;
      const rows = Math.ceil(innerHeight / CONFIG.GRID_SPACING) + 1;
      colsRef.current = cols;
      rowsRef.current = rows;

      for (let gx = 0; gx < cols; gx++) for (let gy = 0; gy < rows; gy++) nodes.current.push({ x: gx * CONFIG.GRID_SPACING, y: gy * CONFIG.GRID_SPACING });

      gridAngles.current = new Array(nodes.current.length).fill(0);

      const now = performance.now();
      attentionLines.current = attentionLines.current.filter(line => line.start + line.duration > now);
      halos.current = halos.current.filter(h => h.start + h.duration > now);
    };

    const recomputeGridAngles = (frameNum: number) => {
      const t = frameNum * CONFIG.NOISE_EVOLUTION_SPEED;
      const nodesLocal = nodes.current;
      const ga = gridAngles.current;
      for (let i = 0; i < nodesLocal.length; i++) {
        const n = nodesLocal[i];
        ga[i] = perlinNoise.noise(n.x * CONFIG.NOISE_SCALE, n.y * CONFIG.NOISE_SCALE, t) * Math.PI * 2;
      }
    };

    const getAngleNearestNode = (x: number, y: number) => {
      const gx = Math.round(x / CONFIG.GRID_SPACING);
      const gy = Math.round(y / CONFIG.GRID_SPACING);
      const cols = colsRef.current;
      const rows = rowsRef.current;
      if (cols <= 0 || rows <= 0) return 0;
      const ix = Math.min(Math.max(gx, 0), cols - 1);
      const iy = Math.min(Math.max(gy, 0), rows - 1);
      const idx = iy + ix * rows;
      return gridAngles.current[idx] ?? 0;
    };

    const similarityWeight = (idxA: number, idxB: number) => {
      const a = gridAngles.current[idxA] ?? 0;
      const b = gridAngles.current[idxB] ?? 0;
      const diff = Math.abs(((a - b + Math.PI) % (2 * Math.PI)) - Math.PI);
      const w = 1 - diff / Math.PI;
      return 0.35 + 0.65 * w;
    };

    const curveSign = (i: number, j: number) => ((i + j) % 2 === 0 ? 1 : -1);

    const spawnAttentionFromNearest = (mx: number, my: number) => {
      try {
        if (nodes.current.length === 0) return;
        const now = performance.now();
        if (now - lastActivation.current < CONFIG.ATTENTION_COOLDOWN_MS) return;
        lastActivation.current = now;

        const gx = Math.round(mx / CONFIG.GRID_SPACING);
        const gy = Math.round(my / CONFIG.GRID_SPACING);
        const cols = colsRef.current;
        const rows = rowsRef.current;
        if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) return;
        const idx = gy + gx * rows;
        if (idx < 0 || idx >= nodes.current.length) return;
        const nearest = nodes.current[idx];
        if (!nearest) return;

        const d = Math.hypot(nearest.x - mx, nearest.y - my);
        if (d > CONFIG.ATTENTION_ACTIVATE_DISTANCE) return;

        const pool = Math.min(CONFIG.ATTENTION_SAMPLE_POOL, nodes.current.length - 1);
        const sampled: { idx: number; w: number }[] = [];
        const tried = new Set<number>();
        while (sampled.length < pool && tried.size < nodes.current.length) {
          const s = Math.floor(Math.random() * nodes.current.length);
          if (s === idx) {
            tried.add(s);
            continue;
          }
          if (tried.has(s)) continue;
          tried.add(s);
          const w = similarityWeight(idx, s);
          sampled.push({ idx: s, w });
        }

        sampled.sort((a, b) => b.w - a.w);
        const top = sampled.slice(0, CONFIG.ATTENTION_TARGET_COUNT);

        let totalOut = 0;
        for (const t of top) totalOut += t.w;

        for (const t of top) {
          if (attentionLines.current.length >= CONFIG.ATTENTION_MAX_LINES) break;
          const toNode = nodes.current[t.idx];
          attentionLines.current.push({ from: nearest, to: toNode, start: now, duration: CONFIG.ATTENTION_DURATION, weight: t.w });
        }

        const normalized = Math.min(1, totalOut / (CONFIG.ATTENTION_TARGET_COUNT * 1.0));
        halos.current.push({ x: nearest.x, y: nearest.y, start: now, duration: CONFIG.ATTENTION_DURATION, intensity: 0.25 + 0.75 * normalized });
        if (halos.current.length > 40) halos.current.splice(0, halos.current.length - 40);
      } catch (e) {
        console.error("spawnAttentionFromNearest error", e);
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

    const quadPoint = (p0: Node, p1: { x: number; y: number }, p2: Node, u: number) => {
      const one = 1 - u;
      const x = one * one * p0.x + 2 * one * u * p1.x + u * u * p2.x;
      const y = one * one * p0.y + 2 * one * u * p1.y + u * u * p2.y;
      return { x, y };
    };

    const animate = () => {
      if (!running) return;
      try {
        const now = performance.now();
        const elapsed = now - lastFrameTime.current;
        const target = 1000 / CONFIG.FPS_CAP;
        if (elapsed < target) {
          animationFrameId.current = requestAnimationFrame(animate);
          return;
        }
        lastFrameTime.current = now;

        const { innerWidth, innerHeight } = window;

        // gentle trail effect
        ctx.fillStyle = `rgba(0,0,0,${CONFIG.BACKGROUND_DIM_ALPHA})`;
        ctx.fillRect(0, 0, innerWidth, innerHeight);

        if (frame % CONFIG.UPDATE_FIELD_EVERY_N_FRAMES === 0) recomputeGridAngles(frame);

        if (frame % CONFIG.DRAW_VECTORS_EVERY_N_FRAMES === 0) drawVectors(ctx);

        // batch particle drawing
        ctx.beginPath();
        for (let i = 0; i < particles.current.length; i++) {
          const p = particles.current[i];
          p.update(getAngleNearestNode);
          ctx.moveTo(p.x + CONFIG.PARTICLE_RADIUS, p.y);
          ctx.arc(p.x, p.y, CONFIG.PARTICLE_RADIUS, 0, Math.PI * 2);
          p.reset(innerWidth, innerHeight);
        }
        ctx.fillStyle = CONFIG.PARTICLE_COLOR;
        ctx.fill();

        const now2 = performance.now();

        // halos
        for (let i = halos.current.length - 1; i >= 0; i--) {
          const h = halos.current[i];
          const t = (now2 - h.start) / h.duration;
          if (t >= 1) {
            halos.current.splice(i, 1);
            continue;
          }
          const fade = 1 - t;
          const alpha = 0.06 * h.intensity * fade;
          const radius = 8 + 40 * h.intensity * (1 - t);

          const grad = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, radius);
          grad.addColorStop(0, `rgba(${CONFIG.COLOR_COOL.join(',')},${alpha})`);
          grad.addColorStop(1, `rgba(${CONFIG.COLOR_COOL.join(',')},0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(h.x, h.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }

        // attention lines (subtle)
        ctx.save();
        ctx.globalCompositeOperation = "lighter" as GlobalCompositeOperation;

        for (let i = attentionLines.current.length - 1; i >= 0; i--) {
          const al = attentionLines.current[i];
          const t = (now2 - al.start) / al.duration;
          if (t >= 1) {
            attentionLines.current.splice(i, 1);
            continue;
          }

          const dx = al.to.x - al.from.x;
          const dy = al.to.y - al.from.y;
          const mx = (al.from.x + al.to.x) / 2;
          const my = (al.from.y + al.to.y) / 2;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;
          const sign = curveSign(Math.round(al.from.x + al.from.y), Math.round(al.to.x + al.to.y));
          const strength = Math.min(1, len / 300) * CONFIG.CURVE_STRENGTH * 300;
          const cx = mx + nx * strength * sign;
          const cy = my + ny * strength * sign;

          const ease = 1 - Math.pow(1 - t, 3);
          const w = al.weight;
          const rgb = weightToRGB(w);

          const alpha = (0.14 + 0.6 * w) * (1 - ease);
          const width = CONFIG.ATTENTION_BASE_LINE_WIDTH * (0.5 + 0.9 * w);

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.lineWidth = width;
          ctx.strokeStyle = `rgba(${rgb},1)`;
          ctx.shadowColor = `rgba(${rgb},0.9)`;
          ctx.shadowBlur = CONFIG.ATTENTION_GLOW_BLUR * (0.6 * w) * (1 - t);

          ctx.beginPath();
          ctx.moveTo(al.from.x, al.from.y);
          ctx.quadraticCurveTo(cx, cy, al.to.x, al.to.y);
          ctx.stroke();

          const spark = quadPoint(al.from, { x: cx, y: cy }, al.to, ease);
          ctx.beginPath();
          ctx.arc(spark.x, spark.y, 1.0 * w, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb},${0.9 * w * (1 - t)})`;
          ctx.fill();

          ctx.restore();
        }

        ctx.restore();

        // cursor smoothing + ring
        if (cursorTarget.current) {
          // lerp towards target
          cursorPos.current.x += (cursorTarget.current.x - cursorPos.current.x) * CONFIG.CURSOR_SMOOTHING;
          cursorPos.current.y += (cursorTarget.current.y - cursorPos.current.y) * CONFIG.CURSOR_SMOOTHING;

          // subtle ring
          const cx = cursorPos.current.x;
          const cy = cursorPos.current.y;

          const ringGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, CONFIG.CURSOR_RING_RADIUS);
          ringGrad.addColorStop(0, `rgba(${CONFIG.COLOR_COOL.join(',')},${CONFIG.CURSOR_RING_FADE})`);
          ringGrad.addColorStop(1, `rgba(${CONFIG.COLOR_COOL.join(',')},0)`);
          ctx.fillStyle = ringGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, CONFIG.CURSOR_RING_RADIUS, 0, Math.PI * 2);
          ctx.fill();

          // small core dot
          ctx.beginPath();
          ctx.arc(cx, cy, 2.0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${CONFIG.COLOR_COOL.join(',')},0.95)`;
          ctx.fill();
        }

        // draw continuous legend (minimal) — keep it optional on homepage
        // drawLegend(ctx, innerWidth, innerHeight);

        frame++;
      } catch (e) {
        console.error("Grid animate error:", e);
      }

      animationFrameId.current = requestAnimationFrame(animate);
    };

    const drawLegend = (ctx: CanvasRenderingContext2D, innerWidth: number, innerHeight: number) => {
      const pad = 14;
      const w = 140;
      const h = 12;
      const x = innerWidth - w - pad;
      const y = pad;

      ctx.save();
      roundRect(ctx, x - 6, y - 6, w + 12, h + 48, 8);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fill();

      const grad = ctx.createLinearGradient(x, y, x + w, y);
      grad.addColorStop(0, `rgba(${CONFIG.COLOR_COOL.join(',')},1)`);
      grad.addColorStop(1, `rgba(${CONFIG.COLOR_WARM.join(',')},1)`);
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);

      ctx.fillStyle = "rgba(230,230,230,0.9)";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("Weight →", x, y + h + 6);
      ctx.textAlign = "center";
      ctx.fillText("low", x + 4, y + h + 22);
      ctx.fillText("mid", x + w / 2, y + h + 22);
      ctx.fillText("high", x + w - 4, y + h + 22);

      ctx.restore();
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
      cursorTarget.current = { x: mx, y: my };
      // spawn attention from nearest only on quicker movements for subtlety
      spawnAttentionFromNearest(mx, my);
    };
    const onPointerLeave = () => {
      cursorTarget.current = null;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerleave", onPointerLeave);

    const onResize = () => {
      window.clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(setup, 120);
    };

    window.addEventListener("resize", onResize);

    return () => {
      running = false;
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
