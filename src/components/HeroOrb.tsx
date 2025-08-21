"use client";

import { useEffect, useRef } from "react";

export default function HeroOrb() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

    // increase density closer to original but keep sprite optimization
    let count = 900; // increased density (kept optimizations to avoid lag)
    let r = 0;

    const nodes3D: Array<{ x: number; y: number; z: number; color: { h: number; s: number; l: number } }> = [];
    const synapses: Array<{ from: number; to: number; progress: number }> = [];
    let activationWave = { progress: -1.5, speed: 0.008 };

    let neighborCandidates: number[][] = [];
    const linkStrength = new Map<string, number>();
    let frame = 0;

    // sprite buckets to tint nodes cheaply
    const TINT_BUCKETS = 16; // more buckets -> smoother color transitions at higher density // more buckets -> less posterization
    let tintedSprites: HTMLCanvasElement[] = [];
    let baseSprite: HTMLCanvasElement | null = null;
    let spriteSize = 0;

    // rotation smoothing
    let rotYPrev = 0;
    let rotXPrev = 0;

    function sizeCanvas() {
      if (!canvas) return;
      const size = Math.min(720, Math.floor(window.innerWidth * 0.82));
      canvas.width = Math.floor(size * dpr);
      canvas.height = Math.floor(size * dpr);
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      r = Math.min(canvas.width, canvas.height) * 0.36;

      // adapt nodes mildly for very small screens
      if (size < 420) count = 520;
      else count = 700;

      createBaseSprite();
      createTintedSprites();
    }

    function createBaseSprite() {
      spriteSize = Math.max(30, Math.floor(48 * dpr)); // slightly smaller sprite to keep drawImage cheap at higher node counts
      const off = document.createElement("canvas");
      off.width = spriteSize;
      off.height = spriteSize;
      const g = off.getContext("2d")!;
      g.clearRect(0, 0, spriteSize, spriteSize);

      const cx = spriteSize / 2;
      const cy = spriteSize / 2;
      const grad = g.createRadialGradient(cx, cy, 0, cx, cy, spriteSize / 2);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.16, "rgba(255,255,255,0.86)");
      grad.addColorStop(0.36, "rgba(255,255,255,0.45)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, spriteSize, spriteSize);

      baseSprite = off;
    }

    function createTintedSprites() {
      tintedSprites = [];
      if (!baseSprite) return;
      for (let b = 0; b < TINT_BUCKETS; b++) {
        const t = b / Math.max(1, TINT_BUCKETS - 1);
        const hue = 190 + t * 30; // 190-220
        const sat = 60;
        const light = 62; // lighter shade per-sprite so additive appears of a lighter hue but we'll dim overall blend to keep it darker visually
        const off = document.createElement("canvas");
        off.width = spriteSize;
        off.height = spriteSize;
        const g = off.getContext("2d")!;
        g.clearRect(0, 0, spriteSize, spriteSize);

        g.drawImage(baseSprite!, 0, 0);
        g.globalCompositeOperation = "source-in";
        g.fillStyle = `hsl(${Math.round(hue)}, ${sat}%, ${light}%)`;
        g.fillRect(0, 0, spriteSize, spriteSize);
        g.globalCompositeOperation = "source-over";

        tintedSprites.push(off);
      }
    }

    function generateNodes() {
      nodes3D.length = 0;
      const rr = r * 0.94;
      for (let i = 0; i < count; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = Math.acos(1 - 2 * u);
        const phi = 2 * Math.PI * v;
        const x = rr * Math.sin(theta) * Math.cos(phi);
        const y = rr * Math.sin(theta) * Math.sin(phi);
        const z = rr * Math.cos(theta);
        const hue = 190 + Math.random() * 30;
        const sat = 55 + Math.random() * 10;
        const light = 44 + Math.random() * 8;
        nodes3D.push({ x, y, z, color: { h: hue, s: sat, l: light } });
      }

      const N = nodes3D.length;
      neighborCandidates = Array.from({ length: N }, () => []);
      for (let i = 0; i < N; i++) {
        const dists: Array<{ idx: number; d: number }> = [];
        const xi = nodes3D[i].x,
          yi = nodes3D[i].y,
          zi = nodes3D[i].z;
        for (let j = 0; j < N; j++) {
          if (i === j) continue;
          const dx = xi - nodes3D[j].x;
          const dy = yi - nodes3D[j].y;
          const dz = zi - nodes3D[j].z;
          dists.push({ idx: j, d: dx * dx + dy * dy + dz * dz });
        }
        dists.sort((a, b) => a.d - b.d);
        neighborCandidates[i] = dists.slice(0, 24).map((x) => x.idx); // restore higher candidate count
      }

      linkStrength.clear();
      for (let i = 0; i < N; i++) {
        const list = neighborCandidates[i];
        for (let k = 0; k < Math.min(6, list.length); k++) {
          const j = list[k];
          const a = Math.min(i, j);
          const b = Math.max(i, j);
          const key = `${a}-${b}`;
          if (!linkStrength.has(key)) linkStrength.set(key, Math.random() * 0.45 + 0.12);
        }
      }
    }

    sizeCanvas();
    generateNodes();

    const onResize = () => {
      sizeCanvas();
      generateNodes();
    };
    window.addEventListener("resize", onResize);

    function rotateXY(p: { x: number; y: number; z: number }, ax: number, ay: number) {
      const cosy = Math.cos(ax);
      const siny = Math.sin(ax);
      const y1 = p.y * cosy - p.z * siny;
      const z1 = p.y * siny + p.z * cosy;
      const cosx = Math.cos(ay);
      const sinx = Math.sin(ay);
      const x2 = p.x * cosx + z1 * sinx;
      const z2 = -p.x * sinx + z1 * cosx;
      return { x: x2, y: y1, z: z2 };
    }

    function clamp(v: number, a = 0, b = 1) {
      return Math.max(a, Math.min(b, v));
    }

    function easeInOutCos(t: number) {
      return 0.5 - 0.5 * Math.cos(Math.PI * t);
    }

    function draw(now: number) {
      if (!ctx || !canvas) return;
      frame++;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      const time = prefersReducedMotion ? 0 : now * 0.001;
      const targetRotY = time * 0.06;
      const targetRotX = Math.sin(time * 0.18) * 0.28 + 0.28;
      const rotY = rotYPrev + (targetRotY - rotYPrev) * 0.09;
      const rotX = rotXPrev + (targetRotX - rotXPrev) * 0.09;
      rotYPrev = rotY;
      rotXPrev = rotX;

      activationWave.progress += activationWave.speed;
      if (activationWave.progress > 1.5) activationWave.progress = -1.5;

      const lightDir = normalize({ x: 0.35, y: -0.6, z: 0.7 });
      const f = r * 1.9;

      const projected: Array<{
        x: number;
        y: number;
        z: number;
        nx: number;
        ny: number;
        nz: number;
        scale: number;
        color: { h: number; s: number; l: number };
      }> = [];
      let zMin = Infinity;
      let zMax = -Infinity;
      for (let i = 0; i < nodes3D.length; i++) {
        const p = nodes3D[i];
        const pr = rotateXY(p, rotX, rotY);
        const nx = pr.x / (r * 0.94);
        const ny = pr.y / (r * 0.94);
        const nz = pr.z / (r * 0.94);
        const zCamera = pr.z;
        if (zCamera < zMin) zMin = zCamera;
        if (zCamera > zMax) zMax = zCamera;
        const scale = f / (f + zCamera);
        projected.push({ x: cx + pr.x * scale, y: cy + pr.y * scale, z: zCamera, nx, ny, nz, scale, color: p.color });
      }

      // slightly stronger vignette to add perceived density
      const grad = ctx.createRadialGradient(cx, cy, r * 0.02, cx, cy, r * 1.05);
      grad.addColorStop(0, "rgba(245,255,255,0)");
      grad.addColorStop(0.68, "rgba(200,230,245,0.07)");
      grad.addColorStop(1, "rgba(150,180,200,0.11)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.02, 0, Math.PI * 2);
      ctx.fill();

      // additive blending but dimmed slightly so overlaps don't wash out
const ADDITIVE_ALPHA = 0.82;
ctx.globalCompositeOperation = "lighter";
ctx.globalAlpha = ADDITIVE_ALPHA;

      // LINKS - draw more links to increase perceived density
      ctx.lineWidth = 1 * dpr;
      for (let i = 0, N = projected.length; i < N; i++) {
        const pi = projected[i];
        const cand = neighborCandidates[i];
        if (!cand) continue;
        const maxNeighborsDraw = 12; // denser linking
        for (let k = 0; k < Math.min(maxNeighborsDraw, cand.length); k++) {
          const j = cand[k];
          if (j <= i) continue;
          const pj = projected[j];
          const dx = pi.x - pj.x;
          const dy = pi.y - pj.y;
          const dist = Math.hypot(dx, dy);

          const avgScale = (pi.scale + pj.scale) * 0.5;
          const threshold = (r * 0.28) * avgScale;
          const baseTarget = clamp(1 - dist / threshold, 0, 1);

          const a = Math.min(i, j);
          const b = Math.max(i, j);
          const key = `${a}-${b}`;
          let s = linkStrength.get(key) ?? 0;

          const jitter = (Math.random() - 0.5) * 0.012;
          s += (baseTarget - s) * 0.06 + jitter;
          if (Math.random() < 0.007) s = Math.max(s, Math.random() * 0.6);
          s = clamp(s, 0, 1);
          linkStrength.set(key, s);

          if (s > 0.03 && baseTarget > 0.01) {
            const alpha = clamp(s * 0.7 * (1 - dist / threshold), 0, 0.78);
            ctx.globalAlpha = alpha * 0.96;
            ctx.strokeStyle = `rgba(55,95,120,${alpha})`;
            ctx.beginPath();
            ctx.moveTo(pi.x, pi.y);
            ctx.lineTo(pj.x, pj.y);
            ctx.stroke();
          }
        }
      }

      // NODES - draw tinted sprites with stronger alpha and slightly larger draw size
      const sprites = tintedSprites;
      const buckets = sprites.length || 1;
      for (let i = 0, N = projected.length; i < N; i++) {
        const p = projected[i];
        const ndotl = clamp(p.nx * lightDir.x + p.ny * lightDir.y + p.nz * lightDir.z, -1, 1);
        const diffuse = clamp((ndotl + 1) / 2, 0, 1);
        const ambient = 0.36;
        const brightness = clamp(ambient + diffuse * 0.64, 0, 1);

        const wavePos = p.y / r;
        const waveProximity = 1 - Math.abs(activationWave.progress - wavePos);
        const waveGlow = clamp(waveProximity, 0, 1);

        const hue = (p.color.h + time * 2.2) % 360;
        const baseLight = p.color.l * 0.92;
        const lightness = clamp(baseLight * brightness + waveGlow * 10, 16, 78);

        const nodeAlpha = 1.0; // stronger opacity
        const radius = Math.max(0.34, 0.66 * (0.85 + (p.z - zMin) / (Math.max(1e-6, zMax - zMin)))) * dpr;
        const drawSize = (radius * 3.6 * (1 + (lightness - p.color.l) * 0.015));

        const bucketIndex = Math.min(
          buckets - 1,
          Math.max(0, Math.floor(((hue - 190) / 30) * (buckets - 1)))
        );
        const sprite = sprites[bucketIndex] || baseSprite!;
        if (sprite) {
          ctx.globalAlpha = nodeAlpha * (0.95 + waveGlow * 0.06);
          ctx.drawImage(sprite, p.x - drawSize / 2, p.y - drawSize / 2, drawSize, drawSize);
        } else {
          ctx.globalAlpha = nodeAlpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.45, radius * 0.64), 0, Math.PI * 2);
          ctx.fillStyle = `hsl(${hue}, ${p.color.s}%, ${lightness}%)`;
          ctx.fill();
        }
      }

      // SYNAPSE PULSES - allow slightly more pulses and stronger alpha
      ctx.lineWidth = 1.5 * dpr;
      for (let i = synapses.length - 1; i >= 0; i--) {
        const synapse = synapses[i];
        synapse.progress += 0.028;
        if (synapse.progress >= 1) {
          synapses.splice(i, 1);
        } else {
          const fromNode = projected[synapse.from];
          const toNode = projected[synapse.to];
          if (!fromNode || !toNode) continue;

          const t = easeInOutCos(synapse.progress);
          const currentX = fromNode.x + (toNode.x - fromNode.x) * t;
          const currentY = fromNode.y + (toNode.y - fromNode.y) * t;

          const pulseBase = 2.8 * dpr;
          const pulseRadius = pulseBase * (1 - Math.abs(0.5 - synapse.progress) * 2);
          const pulseAlpha = 1.0 * (1 - Math.abs(0.5 - synapse.progress) * 2) * 0.98;

          ctx.globalAlpha = pulseAlpha;
          ctx.beginPath();
          ctx.arc(currentX, currentY, Math.max(1, pulseRadius), 0, Math.PI * 2);
          ctx.fillStyle = `hsla(195, 85%, 60%, ${pulseAlpha})`;
          ctx.fill();
        }
      }

      // border ring
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = "rgba(80,100,120,0.12)";
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.99, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      // spawn synapses more often but cap
      if (frame % 6 === 0 && synapses.length < 22) {
        const fromIndex = Math.floor(Math.random() * nodes3D.length);
        const toList = neighborCandidates[fromIndex] || [];
        const toIndex = toList.length ? toList[Math.floor(Math.random() * Math.min(6, toList.length))] : -1;
        if (fromIndex !== toIndex && typeof toIndex === "number" && toIndex >= 0) {
          synapses.push({ from: fromIndex, to: toIndex, progress: 0 });
        }
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };

    function normalize(v: { x: number; y: number; z: number }) {
      const L = Math.hypot(v.x, v.y, v.z) || 1;
      return { x: v.x / L, y: v.y / L, z: v.z / L };
    }
  }, [prefersReducedMotion]);

  return <canvas ref={canvasRef} className="block" aria-hidden style={{ display: "block" }} />;
}
