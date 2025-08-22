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

    // OPTIMIZATION: The callback logic is simplified for clarity.
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the entry that is most visible in the viewport.
        const bestEntry = entries.reduce((best, current) => {
          return current.isIntersecting && current.intersectionRatio > (best?.intersectionRatio ?? 0)
            ? current
            : best;
        }, null as IntersectionObserverEntry | null);

        if (bestEntry) {
          setActiveHash(`#${bestEntry.target.id}`);
        }
      },
      // This rootMargin makes the "active" area the middle 20% of the screen.
      { rootMargin: "-40% 0px -40% 0px" }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });
    
    // Set initial hash if one exists in the URL on page load.
    if (window.location.hash) {
      setActiveHash(window.location.hash);
    }

    // The 'hashchange' listener was removed as it's largely redundant.
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
      // Update the URL without a page reload.
      window.history.pushState(null, "", href);
      // Set active hash immediately for instant UI feedback.
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
            
            // OPTIMIZATION: Logic is broken out for readability.
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
                  className={`relative z-10 block px-4 py-2 transition-colors ${
                    hoveredLink === l.href || active ? "text-white" : "text-white/60"
                  }`}
                >
                  {l.label}
                </Link>

                {/* The Spotlight Effect */}
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