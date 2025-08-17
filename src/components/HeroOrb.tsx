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

    // node storage (local sphere coordinates)
    const nodes3D: Array<{ x: number; y: number; z: number }> = [];
    let count = 1200; // fewer nodes for smoother runtime
    let r = 0;

    // neighbor candidates per node (precomputed by 3D distance)
    let neighborCandidates: number[][] = [];

    // dynamic link strengths keyed by "i-j" (i < j)
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
      for (let i = 0; i < count; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = Math.acos(1 - 2 * u);
        const phi = 2 * Math.PI * v;
        const x = rr * Math.sin(theta) * Math.cos(phi);
        const y = rr * Math.sin(theta) * Math.sin(phi);
        const z = rr * Math.cos(theta);
        nodes3D.push({ x, y, z });
      }

      // build neighbor candidate lists (top N nearest by 3D distance)
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
        // keep top 24 candidates (enough for dynamic joining)
        neighborCandidates[i] = dists.slice(0, 24).map((x) => x.idx);
      }

      // initialize strengths for a subset of pairs
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
    window.addEventListener("resize", () => {
      sizeCanvas();
      generateNodes();
    });

    // rotate point by X (tilt) then Y (spin)
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
      const rotY = time * 0.45; // steady spin
      const rotX = Math.sin(time * 0.28) * 0.35 + 0.28; // gentle oscillating tilt

      // lighting (to look like a globe)
      const lightDir = normalize({ x: 0.35, y: -0.6, z: 0.7 });

      const f = r * 1.9; // focal length

      // project and compute depth stats
      const projected: Array<{ x: number; y: number; z: number; nx: number; ny: number; nz: number; scale: number }> = [];
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
        if (zCamera > zMax) zMax = zMax;
        const scale = f / (f + zCamera);
        projected.push({ x: cx + pr.x * scale, y: cy + pr.y * scale, z: zCamera, nx, ny, nz, scale });
      }

      // draw subtle globe atmosphere (ring + gradient)
      const grad = ctx.createRadialGradient(cx, cy, r * 0.02, cx, cy, r * 1.05);
      grad.addColorStop(0, "rgba(18, 22, 24, 0)");
      grad.addColorStop(0.7, "rgba(14, 24, 26, 0.04)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0.12)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.02, 0, Math.PI * 2);
      ctx.fill();

      // draw dynamic links
      ctx.lineWidth = 1 * dpr;
      for (let i = 0; i < projected.length; i++) {
        const pi = projected[i];
        const cand = neighborCandidates[i];
        if (!cand) continue;
        // consider up to 18 candidates for dynamic joining/breaking
        for (let k = 0; k < Math.min(18, cand.length); k++) {
          const j = cand[k];
          if (j <= i) continue; // ensure each pair only once
          const pj = projected[j];
          const dx = pi.x - pj.x;
          const dy = pi.y - pj.y;
          const dist = Math.hypot(dx, dy);

          // threshold scaled by average depth so close-to-camera nodes keep tighter connections
          const avgScale = (pi.scale + pj.scale) * 0.5;
          const threshold = (r * 0.28) * avgScale;

          // compute target strength based on 3D proximity projection
          const baseTarget = clamp(1 - dist / threshold, 0, 1);

          const a = Math.min(i, j);
          const b = Math.max(i, j);
          const key = `${a}-${b}`;
          let s = linkStrength.get(key) ?? 0;

          // gradually move strength toward target with a bit of jitter so connections visibly form/break
          const jitter = (Math.random() - 0.5) * 0.04;
          s += (baseTarget - s) * 0.12 + jitter;

          // rare random rewiring: sometimes choose a random candidate to start a weak link
          if (Math.random() < 0.009) s = Math.max(s, Math.random() * 0.6);

          s = clamp(s, 0, 1);
          linkStrength.set(key, s);

          if (s > 0.04 && baseTarget > 0.02) {
            // alpha shaped by strength and distance
            const alpha = clamp(s * 0.7 * (1 - dist / threshold), 0, 0.8);
            ctx.globalAlpha = alpha;
            // --- COLOR CHANGE: Switched to a vibrant, electric blue for high visibility ---
            ctx.strokeStyle = `rgba(100, 200, 255, 1)`;
            ctx.beginPath();
            ctx.moveTo(pi.x, pi.y);
            ctx.lineTo(pj.x, pj.y);
            ctx.stroke();
          }
        }
      }

      // draw nodes with globe shading (diffuse + ambient)
      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        // diffuse shading based on normal dot light
        const ndotl = clamp(p.nx * lightDir.x + p.ny * lightDir.y + p.nz * lightDir.z, -1, 1);
        const diffuse = clamp((ndotl + 1) / 2, 0, 1);
        const ambient = 0.35;
        const brightness = clamp(ambient + diffuse * 0.65, 0, 1);

        // --- COLOR CHANGE: Switched to a vibrant, electric blue for high visibility ---
        const baseR = 100;
        const baseG = 200;
        const baseB = 255;

        const nodeAlpha = 0.9 * brightness;
        const radius = Math.max(0.25, 0.6 * (0.85 + (p.z - zMin) / (zMax - zMin || 1))) * dpr;

        ctx.globalAlpha = nodeAlpha;
        ctx.fillStyle = `rgba(${baseR},${baseG},${baseB},1)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // gentle outer rim to emphasize globe boundary
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = "rgba(10,30,34,1)";
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.99, 0, Math.PI * 2);
      ctx.stroke();

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", () => {});
    };

    // helpers
    function normalize(v: { x: number; y: number; z: number }) {
      const L = Math.hypot(v.x, v.y, v.z) || 1;
      return { x: v.x / L, y: v.y / L, z: v.z / L };
    }
  }, [prefersReducedMotion]);

  return <canvas ref={canvasRef} className="block" aria-hidden />;
}
