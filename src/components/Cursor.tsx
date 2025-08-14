"use client";

import { useEffect, useRef, useState } from "react";

export default function Cursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const trailRef = useRef<HTMLDivElement | null>(null);
  const [hoveringInteractive, setHoveringInteractive] = useState(false);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    // respect reduced motion and touch devices
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isTouch = "ontouchstart" in window || (navigator as any).maxTouchPoints > 0;
    if (reduce || isTouch) {
      setEnabled(false);
      return;
    }

    // --- internal refs for performant updates (avoid state churn) ---
    const mouse = { x: -100, y: -100 };
    const ring = { x: -100, y: -100 };
    const lerp = (a: number, b: number, n: number) => a + (b - a) * n;

    // hover batching refs
    const hoverRef = { current: false };
    let hoverUpdateRaf = 0;
    const interactiveSelectors = 'a, button, [role="button"], .cursor-hover';

    // keep a single RAF loop to update all transforms (dot, ring, trail)
    let raf = 0;
    let running = true;

    function applyTransforms() {
      // dot follows mouse exactly (no layout thrash from synchronous updates)
      if (dotRef.current) {
        // use translate3d with pixel values (no rounding here to keep smoothness)
        dotRef.current.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
      }
      // ring lags toward mouse
      ring.x = lerp(ring.x, mouse.x, 0.18);
      ring.y = lerp(ring.y, mouse.y, 0.18);
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0)`;
      }
      // trail snaps to the immediate mouse position (keeps trailing effect high-perf)
      if (trailRef.current) {
        trailRef.current.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
      }
    }

    function loop() {
      if (!running) return;
      applyTransforms();
      raf = requestAnimationFrame(loop);
    }

    // mousemove only writes coordinates (passive listener) — no DOM writes here
    function onMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }
    window.addEventListener("mousemove", onMove, { passive: true });

    // hover detection: batch state updates to avoid frequent re-renders
    function scheduleHoverUpdate(val: boolean) {
      if (hoverRef.current === val) return;
      hoverRef.current = val;
      if (hoverUpdateRaf) cancelAnimationFrame(hoverUpdateRaf);
      hoverUpdateRaf = requestAnimationFrame(() => {
        setHoveringInteractive(hoverRef.current);
        hoverUpdateRaf = 0;
      });
    }

    function onOver(e: Event) {
      const target = e.target as Element | null;
      if (!target) return;
      // keep original matching logic intact
      if (target.matches(interactiveSelectors) || target.closest?.(".cursor-hover")) {
        scheduleHoverUpdate(true);
      }
    }
    function onOut(_e: Event) {
      scheduleHoverUpdate(false);
    }
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);

    // initialize transforms to avoid initial jump
    if (dotRef.current) dotRef.current.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
    if (ringRef.current) ringRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0)`;
    if (trailRef.current) trailRef.current.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;

    // start RAF loop
    raf = requestAnimationFrame(loop);

    return () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      if (hoverUpdateRaf) cancelAnimationFrame(hoverUpdateRaf);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div className="cursor-root" aria-hidden>
      <div ref={trailRef} className="absolute -translate-x-1/2 -translate-y-1/2 w-[70px] h-[70px] rounded-full bg-[#00ffff]/15 blur-lg" />
      <div ref={dotRef} className="absolute top-0 left-0 w-[8px] h-[8px] rounded-full bg-white" />
      <div
        ref={ringRef}
        className={`absolute top-0 left-0 w-[36px] h-[36px] rounded-full border ${hoveringInteractive ? "border-white" : "border-[#00ffff]/70"}`}
      />
    </div>
  );
}
