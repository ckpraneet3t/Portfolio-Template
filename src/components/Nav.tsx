"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const links = [
  { href: "/", label: "Home" },
  { href: "#about", label: "About" },
  { href: "#experience", label: "Experience" },
  { href: "#projects", label: "Projects" },
  { href: "#skills", label: "Skills" },
  { href: "#achievements", label: "Achievements" },
  { href: "#learning", label: "Learning & Ideas" },
  { href: "#contact", label: "Contact" },
];

export default function Nav() {
  const pathname = usePathname();
  const [activeHash, setActiveHash] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Effect to track the visible section using IntersectionObserver.
  useEffect(() => {
    const ids = links
      .map((l) => (l.href.startsWith("#") ? l.href.slice(1) : null))
      .filter(Boolean) as string[];

    if (!ids.length) return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const bestEntry = entries.reduce((best, current) => {
          return current.isIntersecting && current.intersectionRatio > (best?.intersectionRatio ?? 0)
            ? current
            : best;
        }, null as IntersectionObserverEntry | null);

        if (bestEntry) {
          setActiveHash(`#${bestEntry.target.id}`);
        }
      },
      { rootMargin: "-40% 0px -40% 0px" }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });
    
    if (window.location.hash) {
      setActiveHash(window.location.hash);
    }

    return () => observerRef.current?.disconnect();
  }, [pathname]);

  // Effect to clear the active hash on other pages.
  useEffect(() => {
    if (pathname !== "/") setActiveHash(null);
  }, [pathname]);
  
  // Handles smooth scrolling for anchor links.
  function handleAnchorClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault();
    const targetElement = document.getElementById(href.slice(1));
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.pushState(null, "", href);
      setActiveHash(href);
    }
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 backdrop-blur bg-black/30 border-b border-white/10">
      <nav className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-display text-lg text-white">PA</Link>

        <ul
          className="flex items-center gap-2 text-sm"
          onMouseLeave={() => setHoveredLink(null)}
        >
          {links.map((l) => {
            const isAnchor = l.href.startsWith("#");
            
            const isHomeActive = l.href === "/" && pathname === "/" && !activeHash;
            const isAnchorActive = isAnchor && activeHash === l.href;
            const active = isHomeActive || isAnchorActive;
            
            return (
              <li
                key={l.href}
                className="relative"
                onMouseEnter={() => setHoveredLink(l.href)}
              >
                <Link
                  href={l.href}
                  onClick={(e) => isAnchor && handleAnchorClick(e, l.href)}
                  // --- MODIFICATION START ---
                  // Added `border`, `rounded-md`, and conditional border colors.
                  className={`relative z-10 block px-4 py-2 transition-colors border rounded-md ${
                    hoveredLink === l.href || active 
                      ? "text-white border-white" 
                      : "text-white/60 border-white/60"
                  }`}
                  // --- MODIFICATION END ---
                >
                  {l.label}
                </Link>

                {/* The Spotlight Effect still works, appearing behind the bordered button */}
                {(hoveredLink === l.href || active) && (
                  <motion.div
                    layoutId="nav-spotlight"
                    className="absolute inset-0 rounded-full [background:radial-gradient(circle_at_center,_rgba(255,255,255,0.07)_0%,_rgba(255,255,255,0)_60%)]"
                    transition={{ type: "tween", ease: "circOut", duration: 0.4 }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}