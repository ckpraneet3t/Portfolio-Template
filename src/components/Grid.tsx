"use client";

import { useEffect, useRef } from "react";

// --- Configuration Constants ---
const CONFIG = {
  // Grid settings (now a base influence layer)
  GRID_COLOR: "rgba(80, 80, 120, 0.5)", 
  GRID_SPACING: 40,
  GRID_POINT_RADIUS: 1,
  GRID_POINT_GLOW: 7,

  // Particle settings
  PARTICLE_COLOR: "rgba(255, 107, 1, 0.9)",
  PARTICLE_COUNT: 1200,
  PARTICLE_RADIUS: 0.75,
  PARTICLE_SPEED_LIMIT: 1.5, // Max speed
  
  // Transformer-inspired "Self-Attention" settings
  ATTENTION_RADIUS: 60, // How far a particle "looks" for neighbors
  ATTENTION_FORCE: 0.05, // How strongly particles influence each other
  GRID_INFLUENCE: 0.1, // How much the base grid affects particles

  // Noise field settings
  NOISE_SCALE: 0.02,
  NOISE_EVOLUTION_SPEED: 0.0005,
};

// --- Perlin Noise Generator (Unchanged) ---
class PerlinNoiseGenerator {
  private p: Uint8Array = new Uint8Array(512);
  constructor() { this.init(); }
  public init() {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) this.p[i] = p[i & 255];
  }
  private fade(t: number): number { return t * t * t * (t * (t * 6 - 15) + 10); }
  private lerp(t: number, a: number, b: number): number { return a + t * (b - a); }
  private grad(hash: number, x: number, y: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
  public noise(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = this.fade(x), v = this.fade(y), w = this.fade(z);
    const A = this.p[X] + Y, AA = this.p[A] + Z, AB = this.p[A + 1] + Z;
    const B = this.p[X + 1] + Y, BA = this.p[B] + Z, BB = this.p[B + 1] + Z;
    return this.lerp(w, this.lerp(v, this.lerp(u, this.grad(this.p[AA], x, y), this.grad(this.p[BA], x - 1, y)), this.lerp(u, this.grad(this.p[AB], x, y - 1), this.grad(this.p[BB], x - 1, y - 1))), this.lerp(v, this.lerp(u, this.grad(this.p[AA + 1], x, y), this.grad(this.p[BA + 1], x - 1, y)), this.lerp(u, this.grad(this.p[AB + 1], x, y - 1), this.grad(this.p[BB + 1], x - 1, y - 1))));
  }
}
const perlinNoise = new PerlinNoiseGenerator();

// --- Vector Type ---
type Vector = { x: number; y: number };

// --- Particle Class ---
class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.vx = (Math.random() - 0.5) * 2;
    this.vy = (Math.random() - 0.5) * 2;
  }

  update(gridInfluence: Vector, neighbors: Particle[]) {
    // 1. Calculate the "Attention" vector from neighbors
    const attentionVec = { x: 0, y: 0 };
    let neighborCount = 0;
    for (const neighbor of neighbors) {
      const dx = neighbor.x - this.x;
      const dy = neighbor.y - this.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > 0 && distSq < CONFIG.ATTENTION_RADIUS * CONFIG.ATTENTION_RADIUS) {
        // Weight by inverse distance - closer particles have more influence
        const weight = 1 - Math.sqrt(distSq) / CONFIG.ATTENTION_RADIUS;
        attentionVec.x += neighbor.vx * weight;
        attentionVec.y += neighbor.vy * weight;
        neighborCount++;
      }
    }

    if (neighborCount > 0) {
      attentionVec.x /= neighborCount;
      attentionVec.y /= neighborCount;
    }

    // 2. Combine forces: grid influence + self-attention + own velocity
    // Lerp towards the attention vector
    this.vx = this.vx * (1 - CONFIG.ATTENTION_FORCE) + attentionVec.x * CONFIG.ATTENTION_FORCE;
    this.vy = this.vy * (1 - CONFIG.ATTENTION_FORCE) + attentionVec.y * CONFIG.ATTENTION_FORCE;

    // Gently nudge by the grid
    this.vx += gridInfluence.x * CONFIG.GRID_INFLUENCE;
    this.vy += gridInfluence.y * CONFIG.GRID_INFLUENCE;

    // 3. Limit speed
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > CONFIG.PARTICLE_SPEED_LIMIT) {
      this.vx = (this.vx / speed) * CONFIG.PARTICLE_SPEED_LIMIT;
      this.vy = (this.vy / speed) * CONFIG.PARTICLE_SPEED_LIMIT;
    }

    // 4. Update position
    this.x += this.vx;
    this.y += this.vy;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, CONFIG.PARTICLE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = CONFIG.PARTICLE_COLOR;
    ctx.fill();
  }

  reset(canvasWidth: number, canvasHeight: number) {
    if (this.x < 0) this.x = canvasWidth;
    if (this.x > canvasWidth) this.x = 0;
    if (this.y < 0) this.y = canvasHeight;
    if (this.y > canvasHeight) this.y = 0;
  }
}

// --- Spatial Hash Grid for optimizing neighbor search ---
class SpatialHashGrid {
    private cells: Map<string, Particle[]> = new Map();
    private cellSize: number;

    constructor(cellSize: number) {
        this.cellSize = cellSize;
    }

    private getKey(x: number, y: number): string {
        return `${Math.floor(x / this.cellSize)}:${Math.floor(y / this.cellSize)}`;
    }

    clear() {
        this.cells.clear();
    }

    insert(particle: Particle) {
        const key = this.getKey(particle.x, particle.y);
        if (!this.cells.has(key)) {
            this.cells.set(key, []);
        }
        this.cells.get(key)!.push(particle);
    }

    getNeighbors(particle: Particle): Particle[] {
        const neighbors: Particle[] = [];
        const x = Math.floor(particle.x / this.cellSize);
        const y = Math.floor(particle.y / this.cellSize);

        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const key = `${x + i}:${y + j}`;
                if (this.cells.has(key)) {
                    neighbors.push(...this.cells.get(key)!);
                }
            }
        }
        return neighbors;
    }
}


// --- Main Component ---
export default function Grid() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const particles = useRef<Particle[]>([]);
  const spatialGrid = useRef<SpatialHashGrid | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let frame = 0;

    const setup = () => {
      const dpr = window.devicePixelRatio || 1;
      const { innerWidth, innerHeight } = window;

      canvas.width = innerWidth * dpr;
      canvas.height = innerHeight * dpr;
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      
      ctx.resetTransform();
      ctx.scale(dpr, dpr);

      particles.current = [];
      for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
        particles.current.push(new Particle(innerWidth, innerHeight));
      }
      spatialGrid.current = new SpatialHashGrid(CONFIG.ATTENTION_RADIUS);
    };
    
    const getGridInfluence = (x: number, y: number): Vector => {
        const angle = perlinNoise.noise(
            x * CONFIG.NOISE_SCALE / CONFIG.GRID_SPACING,
            y * CONFIG.NOISE_SCALE / CONFIG.GRID_SPACING,
            frame * CONFIG.NOISE_EVOLUTION_SPEED
        ) * Math.PI * 2;
        return { x: Math.cos(angle), y: Math.sin(angle) };
    }

    const animate = () => {
      const { innerWidth, innerHeight } = window;
      ctx.clearRect(0, 0, innerWidth, innerHeight);

      // 1. Draw the base grid points
      ctx.fillStyle = CONFIG.GRID_COLOR;
      ctx.shadowColor = CONFIG.GRID_COLOR;
      ctx.shadowBlur = CONFIG.GRID_POINT_GLOW;
      for (let y = 0; y < innerHeight; y += CONFIG.GRID_SPACING) {
        for (let x = 0; x < innerWidth; x += CONFIG.GRID_SPACING) {
          ctx.beginPath();
          ctx.arc(x, y, CONFIG.GRID_POINT_RADIUS, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      // 2. Update spatial grid
      spatialGrid.current?.clear();
      particles.current.forEach(p => spatialGrid.current?.insert(p));

      // 3. Update and draw particles
      particles.current.forEach((p) => {
        const gridInfluence = getGridInfluence(p.x, p.y);
        const neighbors = spatialGrid.current?.getNeighbors(p) || [];
        p.update(gridInfluence, neighbors);
        p.draw(ctx);
        p.reset(innerWidth, innerHeight);
      });

      frame++;
      animationFrameId.current = requestAnimationFrame(animate);
    };

    setup();
    perlinNoise.init();
    animate();

    let resizeTimeout: number;
    const onResize = () => {
      window.clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(setup, 100);
    };
    window.addEventListener("resize", onResize);

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
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
