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

    // Dark, cool, visually rich but optimized
    let count = 820; // dense but not excessive
    let r = 0;

    const nodes3D: Array<{ x: number; y: number; z: number; color: { h: number; s: number; l: number } }> = [];
    const synapses: Array<{ from: number; to: number; progress: number }> = [];
    let activationWave = { progress: -1.6, speed: 0.0075 };

    let neighborCandidates: number[][] = [];
    const linkStrength = new Map<string, number>();
    let frame = 0;

    const TINT_BUCKETS = 16;
    let tintedSprites: HTMLCanvasElement[] = [];
    let baseSprite: HTMLCanvasElement | null = null;
    let spriteSize = 0;

    // Land/water mask offscreen + raw pixel buffer for fast sampling
    let landMask: HTMLCanvasElement | null = null;
    let landMaskData: Uint8ClampedArray | null = null;
    let landW = 0;
    let landH = 0;

    // blending control for darker additive look
    const ADDITIVE_ALPHA = 0.78; // slightly dimmer additive to avoid washout

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

      if (size < 420) count = 600;
      else count = 820;

      createBaseSprite();
      createTintedSprites();
      createLandMask();
    }

    function createBaseSprite() {
      spriteSize = Math.max(28, Math.floor(44 * dpr));
      const off = document.createElement("canvas");
      off.width = spriteSize;
      off.height = spriteSize;
      const g = off.getContext("2d")!;
      g.clearRect(0, 0, spriteSize, spriteSize);

      const cx = spriteSize / 2;
      const cy = spriteSize / 2;

      // base: soft bright core fading quickly -> helps glow without expensive shadowBlur
      const grad = g.createRadialGradient(cx, cy, 0, cx, cy, spriteSize / 2);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.12, "rgba(255,255,255,0.9)");
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
        // hue range biased to cool/indigo
        const hue = 200 + t * 40; // 200 - 240
        const sat = 56; // moderate saturation
        const light = 30 + Math.round(t * 8); // darker overall for dark theme

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

        // subtle radial desaturation to keep outer edges cooler
        const edgeGrad = g.createRadialGradient(spriteSize / 2, spriteSize / 2, spriteSize * 0.18, spriteSize / 2, spriteSize / 2, spriteSize / 2);
        edgeGrad.addColorStop(0, "rgba(0,0,0,0)");
        edgeGrad.addColorStop(1, "rgba(6,10,18,0.18)");
        g.fillStyle = edgeGrad;
        g.fillRect(0, 0, spriteSize, spriteSize);

        tintedSprites.push(off);
      }
    }

    // simple hash-based pseudo-random for noise
    function rand(x: number, y: number, seed = 0) {
      const s = Math.sin(x * 127.1 + y * 311.7 + seed * 101.7) * 43758.5453123;
      return s - Math.floor(s);
    }

    // fractal noise (cheap fBm using rand)
    function fbm(x: number, y: number) {
      let value = 0;
      let amplitude = 0.5;
      let frequency = 1;
      for (let o = 0; o < 5; o++) {
        value += amplitude * rand(x * frequency, y * frequency, o * 13);
        frequency *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }

    function createLandMask() {
      // create an offscreen canvas sized to the drawing canvas
      const size = Math.min(720, Math.floor(window.innerWidth * 0.82));
      const w = Math.floor(size * dpr);
      const h = Math.floor(size * dpr);
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const g = off.getContext("2d")!;

      // colors: water = lighter cool, land = darker cool
      const water = { r: 84, g: 130, b: 160 }; // desaturated cyan-blue (lighter)
      const land = { r: 12, g: 20, b: 34 }; // deep indigo/near-black (darker)

      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.36;

      const img = g.createImageData(w, h);
      const data = img.data;

      // compute mask inside the circle only
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
          const dx = (i - cx) / radius;
          const dy = (j - cy) / radius;
          const dist = Math.hypot(dx, dy);
          const idx = (j * w + i) * 4;

          if (dist > 1.02) {
            // outside orb: fully transparent
            data[idx + 0] = 0;
            data[idx + 1] = 0;
            data[idx + 2] = 0;
            data[idx + 3] = 0;
            continue;
          }

          // create an organic value using fbm on normalized coords
          const nx = dx * 1.6 + 0.5; // stretch to shape continents
          const ny = dy * 1.2 + 0.5;
          let v = fbm(nx * 1.8, ny * 1.8);

          // bias by radial falloff so center is more likely water/land preference
          const radial = clamp(1 - dist, 0, 1);
          v = v * 0.92 + radial * 0.08;

          // stronger thresholding for clearer separation (small smoothness)
          const threshold = 0.52; // controls water vs land ratio
          const smoothness = 0.06; // smaller -> sharper coastlines
          // use smoothstep-like mapping for crisp but slightly blended boundary
          let t = (v - (threshold - smoothness)) / (2 * smoothness);
          t = clamp(t, 0, 1);

          // t closer to 1 => water-like (lighter), 0 => land
          const wt = t;
          const rcol = Math.round(land.r * (1 - wt) + water.r * wt);
          const gcol = Math.round(land.g * (1 - wt) + water.g * wt);
          const bcol = Math.round(land.b * (1 - wt) + water.b * wt);

          // edge alpha to create coastlines (stronger contrast near coast)
          const alpha = Math.round(255 * clamp(0.92 * (1 - dist * 0.95) * (0.52 + 0.48 * wt), 0.06, 1));

          data[idx + 0] = rcol;
          data[idx + 1] = gcol;
          data[idx + 2] = bcol;
          data[idx + 3] = alpha;
        }
      }

      g.putImageData(img, 0, 0);

      // soft blur by drawing scaled down/up to soften edges (cheap blur)
      const blur = document.createElement("canvas");
      blur.width = w;
      blur.height = h;
      const bg = blur.getContext("2d")!;
      const s = Math.max(0.86, 1 - 0.03 * dpr);
      bg.drawImage(off, 0, 0, Math.floor(w * s), Math.floor(h * s));
      bg.globalCompositeOperation = "source-over";
      bg.globalAlpha = 0.96;
      bg.drawImage(off, 0, 0, w, h);

      landMask = blur;

      // cache raw pixel data for fast sampling (we'll sample it per-node cheaply)
      try {
        const cached = bg.getImageData(0, 0, w, h);
        landMaskData = cached.data;
        landW = w;
        landH = h;
      } catch (e) {
        // getImageData may throw if canvas tainted; fallback to reading from blur canvas during draw
        landMaskData = null;
        landW = w;
        landH = h;
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
        const hue = 200 + Math.random() * 40;
        const sat = 42 + Math.random() * 10;
        const light = 26 + Math.random() * 8; // darker nodes
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
        neighborCandidates[i] = dists.slice(0, 20).map((x) => x.idx); // good balance
      }

      linkStrength.clear();
      for (let i = 0; i < N; i++) {
        const list = neighborCandidates[i];
        for (let k = 0; k < Math.min(6, list.length); k++) {
          const j = list[k];
          const a = Math.min(i, j);
          const b = Math.max(i, j);
          const key = `${a}-${b}`;
          if (!linkStrength.has(key)) linkStrength.set(key, Math.random() * 0.45 + 0.08);
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

    function sampleMaskAt(px: number, py: number, cx: number, cy: number, radius: number) {
      // px,py are canvas coords
      if (!landMaskData) {
        // fallback: sample by drawing 1px into temporary canvas (rare)
        try {
          const sx = Math.max(0, Math.min(landW - 1, Math.floor((px / (cx * 2)) * landW + landW / 2)));
          const sy = Math.max(0, Math.min(landH - 1, Math.floor((py / (cy * 2)) * landH + landH / 2)));
          const idx = (sy * landW + sx) * 4;
          if (!landMaskData) return 0;
          return landMaskData[idx + 0] / 255; // red channel as proxy
        } catch (e) {
          return 0;
        }
      }

      // map canvas coords to mask pixel coords
      const mx = Math.floor((px / (cx * 2)) * landW + landW / 2);
      const my = Math.floor((py / (cy * 2)) * landH + landH / 2);
      if (mx < 0 || my < 0 || mx >= landW || my >= landH) return 0;
      const idx = (my * landW + mx) * 4;
      const r = landMaskData[idx];
      // we encoded water lighter and land darker -> compute "waterness"
      // return normalized value where 1 => water-like (lighter), 0 => land-like (darker)
      // use red channel since we interpolated between land.r and water.r
      return r / 255;
    }

    function draw(now: number) {
      if (!ctx || !canvas) return;
      frame++;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      // clear underlying (keep canvas transparent outside orb)
      ctx.clearRect(0, 0, w, h);

      const time = prefersReducedMotion ? 0 : now * 0.001;
      const targetRotY = time * 0.05;
      const targetRotX = Math.sin(time * 0.16) * 0.28 + 0.26;
      const rotY = rotYPrev + (targetRotY - rotYPrev) * 0.07;
      const rotX = rotXPrev + (targetRotX - rotXPrev) * 0.07;
      rotYPrev = rotY;
      rotXPrev = rotX;

      activationWave.progress += activationWave.speed;
      if (activationWave.progress > 1.6) activationWave.progress = -1.6;

      const lightDir = normalize({ x: 0.2, y: -0.55, z: 0.8 });
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

      // draw land/water mask first so nodes overlay it
      if (landMask) {
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.drawImage(landMask, 0, 0, w, h);
        ctx.restore();
      }

      // dark cool inner overlay to emphasize depth
      const innerGrad = ctx.createRadialGradient(cx, cy, r * 0.02, cx, cy, r * 1.02);
      innerGrad.addColorStop(0, "rgba(0,0,0,0)");
      innerGrad.addColorStop(0.6, "rgba(6,10,18,0.12)");
      innerGrad.addColorStop(1, "rgba(4,6,12,0.28)");
      ctx.fillStyle = innerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.02, 0, Math.PI * 2);
      ctx.fill();

      // additive blending but dimmed
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = ADDITIVE_ALPHA;

      // LINKS - darker, cool strokes with moderate density
      ctx.lineWidth = 1 * dpr;
      for (let i = 0, N = projected.length; i < N; i++) {
        const pi = projected[i];
        const cand = neighborCandidates[i];
        if (!cand) continue;
        const maxNeighborsDraw = 10;
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

          const jitter = (Math.random() - 0.5) * 0.01;
          s += (baseTarget - s) * 0.055 + jitter;
          if (Math.random() < 0.0065) s = Math.max(s, Math.random() * 0.55);
          s = clamp(s, 0, 1);
          linkStrength.set(key, s);

          if (s > 0.03 && baseTarget > 0.01) {
            const alpha = clamp(s * 0.68 * (1 - dist / threshold), 0, 0.8);
            ctx.globalAlpha = alpha * 0.9 * ADDITIVE_ALPHA;
            // cool indigo-blue link
            ctx.strokeStyle = `rgba(58,110,150,${alpha})`;
            ctx.beginPath();
            ctx.moveTo(pi.x, pi.y);
            ctx.lineTo(pj.x, pj.y);
            ctx.stroke();
          }
        }
      }

      // NODES - draw tinted sprites; darker base, lighter core due to sprite
      const sprites = tintedSprites;
      const buckets = sprites.length || 1;
      for (let i = 0, N = projected.length; i < N; i++) {
        const p = projected[i];

        // sample mask to decide if this node sits on water or land
        const maskVal = sampleMaskAt(p.x, p.y, cx, cy, r);
        // maskVal ~ 0 => land (dark), ~1 => water (lighter)

        const ndotl = clamp(p.nx * lightDir.x + p.ny * lightDir.y + p.nz * lightDir.z, -1, 1);
        const diffuse = clamp((ndotl + 1) / 2, 0, 1);
        const ambient = 0.34;
        const brightness = clamp(ambient + diffuse * 0.66, 0, 1);

        const wavePos = p.y / r;
        const waveProximity = 1 - Math.abs(activationWave.progress - wavePos);
        const waveGlow = clamp(waveProximity, 0, 1);

        const hue = (p.color.h + time * 1.8) % 360;
        const baseLight = p.color.l * 0.9;
        const lightness = clamp(baseLight * brightness + waveGlow * 8, 12, 64);

        // tweak node appearance depending on mask: on land -> darker, on water -> slightly brighter and cyan-tinged
        const isWater = maskVal > 0.45; // threshold for water
        let nodeAlpha = 0.98;
        let tintHue = hue;
        let tintSat = p.color.s;
        if (isWater) {
          tintHue = 195; // slightly cyan
          tintSat = Math.max(50, tintSat);
          nodeAlpha *= 1.02;
        } else {
          tintHue = 220; // deeper indigo-ish for land nodes
          tintSat = Math.max(32, tintSat - 6);
          nodeAlpha *= 0.88; // slightly dimmer on land
        }

        const radius = Math.max(0.36, 0.68 * (0.85 + (p.z - zMin) / (Math.max(1e-6, zMax - zMin)))) * dpr;
        const drawSize = radius * 3.8 * (1 + (lightness - p.color.l) * 0.012);

        const bucketIndex = Math.min(
          buckets - 1,
          Math.max(0, Math.floor(((tintHue - 200) / 40) * (buckets - 1)))
        );
        const sprite = sprites[bucketIndex] || baseSprite!;
        if (sprite) {
          ctx.globalAlpha = nodeAlpha * (0.9 + waveGlow * 0.06) * ADDITIVE_ALPHA;
          ctx.drawImage(sprite, p.x - drawSize / 2, p.y - drawSize / 2, drawSize, drawSize);
        } else {
          ctx.globalAlpha = nodeAlpha * ADDITIVE_ALPHA;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.5, radius * 0.66), 0, Math.PI * 2);
          ctx.fillStyle = `hsl(${tintHue}, ${tintSat}%, ${lightness}%)`;
          ctx.fill();
        }
      }

      // SYNAPSE PULSES - cool, slightly brighter pulses but capped
      ctx.lineWidth = 1.5 * dpr;
      for (let i = synapses.length - 1; i >= 0; i--) {
        const synapse = synapses[i];
        synapse.progress += 0.0265;
        if (synapse.progress >= 1) {
          synapses.splice(i, 1);
        } else {
          const fromNode = projected[synapse.from];
          const toNode = projected[synapse.to];
          if (!fromNode || !toNode) continue;

          const t = easeInOutCos(synapse.progress);
          const currentX = fromNode.x + (toNode.x - fromNode.x) * t;
          const currentY = fromNode.y + (toNode.y - fromNode.y) * t;

          const pulseBase = 2.6 * dpr;
          const pulseRadius = pulseBase * (1 - Math.abs(0.5 - synapse.progress) * 2);
          const pulseAlpha = 1.0 * (1 - Math.abs(0.5 - synapse.progress) * 2);

          ctx.globalAlpha = pulseAlpha * 0.98;
          ctx.beginPath();
          ctx.arc(currentX, currentY, Math.max(1, pulseRadius), 0, Math.PI * 2);
          // brighter cyan-ish pulse on dark background
          ctx.fillStyle = `hsla(190, 92%, 60%, ${pulseAlpha * 0.96})`;
          ctx.fill();
        }
      }

      // border ring - subtle
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = "rgba(20,30,40,0.12)";
      ctx.lineWidth = 2 * dpr;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.99, 0, Math.PI * 2);
      ctx.stroke();

      // restore defaults
      ctx.globalAlpha = 1;

      // spawn synapses at steady rate, cap to keep perf stable
      if (frame % 5 === 0 && synapses.length < 26) {
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
