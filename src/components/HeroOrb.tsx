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

    const nodes3D: Array<{ x: number; y: number; z: number; color: { h: number; s: number; l: number } }> = [];
    let count = 700;
    let r = 0;

    const synapses: Array<{ from: number; to: number; progress: number }> = [];
    // --- DEEP LEARNING VIBE: Track the activation wave progress ---
    let activationWave = { progress: -1.5, speed: 0.01 };

    let neighborCandidates: number[][] = [];
    const linkStrength = new Map<string, number>();
    let frame = 0;

    function sizeCanvas() {
      if (!canvas) return;
      const size = Math.min(640, Math.floor(window.innerWidth * 0.8));
      canvas.width = Math.floor(size * dpr);
      canvas.height = Math.floor(size * dpr);
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      r = Math.min(canvas.width, canvas.height) * 0.36;
    }

    function generateNodes() {
      nodes3D.length = 0;
      const rr = r * 0.94;
      // subtle teal/blue palette centered around 195-210 hue range
      for (let i = 0; i < count; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = Math.acos(1 - 2 * u);
        const phi = 2 * Math.PI * v;
        const x = rr * Math.sin(theta) * Math.cos(phi);
        const y = rr * Math.sin(theta) * Math.sin(phi);
        const z = rr * Math.cos(theta);
        // --- COLOR CHANGE: Muted teal/blue tones for yellow background ---
        const hue = 190 + Math.random() * 30; // 190 - 220 (teal -> soft blue)
        const sat = 55 + Math.random() * 15; // moderate saturation
        const light = 45 + Math.random() * 10; // moderate lightness (avoids washing to white)
        nodes3D.push({ x, y, z, color: { h: hue, s: sat, l: light } });
      }

      const N = nodes3D.length;
      neighborCandidates = Array.from({ length: N }, () => []);
      for (let i = 0; i < N; i++) {
        const dists: Array<{ idx: number; d: number }> = [];
        for (let j = 0; j < N; j++) {
          if (i === j) continue;
          const dx = nodes3D[i].x - nodes3D[j].x;
          const dy = nodes3D[i].y - nodes3D[j].y;
          const dz = nodes3D[i].z - nodes3D[j].z;
          dists.push({ idx: j, d: dx * dx + dy * dy + dz * dz });
        }
        dists.sort((a, b) => a.d - b.d);
        neighborCandidates[i] = dists.slice(0, 24).map((x) => x.idx);
      }

      linkStrength.clear();
      for (let i = 0; i < N; i++) {
        const list = neighborCandidates[i];
        for (let k = 0; k < Math.min(6, list.length); k++) {
          const j = list[k];
          const a = Math.min(i, j);
          const b = Math.max(i, j);
          const key = `${a}-${b}`;
          if (!linkStrength.has(key)) linkStrength.set(key, Math.random() * 0.6 + 0.1);
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

    function draw(now: number) {
      if (!ctx || !canvas) return;
      frame++;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      const time = prefersReducedMotion ? 0 : now * 0.001;
      const rotY = time * 0.1;
      const rotX = Math.sin(time * 0.28) * 0.35 + 0.28;

      // --- DEEP LEARNING VIBE: Update and reset the activation wave ---
      activationWave.progress += activationWave.speed;
      if (activationWave.progress > 1.5) {
        activationWave.progress = -1.5;
      }

      const lightDir = normalize({ x: 0.35, y: -0.6, z: 0.7 });
      const f = r * 1.9;

      const projected: Array<{ x: number; y: number; z: number; nx: number; ny: number; nz: number; scale: number; color: { h: number; s: number; l: number } }> = [];
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
        if (zCamera > zMax) zMax = zCamera; // fixed bug here (previously assigned zMax = zMax)
        const scale = f / (f + zCamera);
        projected.push({ x: cx + pr.x * scale, y: cy + pr.y * scale, z: zCamera, nx, ny, nz, scale, color: p.color });
      }

      // --- COLOR CHANGE: Gradient adjusted to pair gently with yellow background ---
      // subtle cool center, soft deeper ring; low opacities so it doesn't dominate
      const grad = ctx.createRadialGradient(cx, cy, r * 0.02, cx, cy, r * 1.05);
      grad.addColorStop(0, "rgba(245, 255, 255, 0)"); // near transparent
      grad.addColorStop(0.7, "rgba(200, 230, 245, 0.06)"); // pale cyan hint
      grad.addColorStop(1, "rgba(150, 180, 200, 0.12)"); // soft cool vignette
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.02, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = 1 * dpr;
      for (let i = 0; i < projected.length; i++) {
        const pi = projected[i];
        const cand = neighborCandidates[i];
        if (!cand) continue;
        for (let k = 0; k < Math.min(18, cand.length); k++) {
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

          const jitter = (Math.random() - 0.5) * 0.04;
          s += (baseTarget - s) * 0.12 + jitter;
          if (Math.random() < 0.009) s = Math.max(s, Math.random() * 0.6);
          s = clamp(s, 0, 1);
          linkStrength.set(key, s);

          if (s > 0.04 && baseTarget > 0.02) {
            const alpha = clamp(s * 0.7 * (1 - dist / threshold), 0, 0.8);
            ctx.globalAlpha = alpha;
            // --- COLOR CHANGE: Link color muted cool blue for contrast with yellow ---
            ctx.strokeStyle = `hsl(205, 30%, 30%)`; // darker muted blue
            ctx.beginPath();
            ctx.moveTo(pi.x, pi.y);
            ctx.lineTo(pj.x, pj.y);
            ctx.stroke();
          }
        }
      }

      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        const ndotl = clamp(p.nx * lightDir.x + p.ny * lightDir.y + p.nz * lightDir.z, -1, 1);
        const diffuse = clamp((ndotl + 1) / 2, 0, 1);
        const ambient = 0.36;
        const brightness = clamp(ambient + diffuse * 0.64, 0, 1);

        // --- DEEP LEARNING VIBE: Calculate node's position relative to the wave ---
        const wavePos = p.y / r; // Wave travels vertically
        const waveProximity = 1 - Math.abs(activationWave.progress - wavePos);
        const waveGlow = clamp(waveProximity, 0, 1);

        const hue = (p.color.h + time * 6) % 360; // slower hue drift (subtle)
        // --- COLOR CHANGE: Adjusted lightness calculation for a yellow background ---
        // keep nodes somewhat subdued, with a small extra lift from the wave
        const baseLight = p.color.l * 0.9; // slightly darker baseline
        const lightness = clamp(baseLight * brightness + waveGlow * 12, 18, 78);
        const nodeColor = `hsl(${hue}, ${p.color.s}%, ${lightness}%)`;

        const nodeAlpha = 0.9;
        // safe radius calculation; avoid divide by zero
        const radius = Math.max(0.25, 0.6 * (0.85 + (p.z - zMin) / (Math.max(1e-6, zMax - zMin)))) * dpr;

        ctx.globalAlpha = nodeAlpha;
        ctx.fillStyle = nodeColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (frame % 5 === 0 && synapses.length < 20) {
        const fromIndex = Math.floor(Math.random() * nodes3D.length);
        const toIndex = neighborCandidates[fromIndex][Math.floor(Math.random() * Math.min(6, neighborCandidates[fromIndex].length))];
        if (fromIndex !== toIndex && typeof toIndex === "number") {
          synapses.push({ from: fromIndex, to: toIndex, progress: 0 });
        }
      }

      ctx.lineWidth = 1.5 * dpr;
      for (let i = synapses.length - 1; i >= 0; i--) {
        const synapse = synapses[i];
        synapse.progress += 0.04;

        if (synapse.progress >= 1) {
          synapses.splice(i, 1);
        } else {
          const fromNode = projected[synapse.from];
          const toNode = projected[synapse.to];

          if (!fromNode || !toNode) continue;

          const startX = fromNode.x;
          const startY = fromNode.y;
          const endX = toNode.x;
          const endY = toNode.y;

          const currentX = startX + (endX - startX) * synapse.progress;
          const currentY = startY + (endY - startY) * synapse.progress;

          const pulseRadius = (1 - Math.abs(0.5 - synapse.progress) * 2) * 3 * dpr;

          ctx.globalAlpha = (1 - Math.abs(0.5 - synapse.progress) * 2);
          // --- COLOR CHANGE: Synapse pulse in a soft cyan (visible, not garish) ---
          ctx.fillStyle = `hsl(195, 85%, 60%)`;
          ctx.beginPath();
          ctx.arc(currentX, currentY, pulseRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 0.06;
      // --- COLOR CHANGE: Border color to a soft cool ring ---
      ctx.strokeStyle = "rgba(80,100,120,0.12)"; // subtle cool grey-blue
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.99, 0, Math.PI * 2);
      ctx.stroke();

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
