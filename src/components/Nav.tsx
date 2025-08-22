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

  // This effect tracks which section is visible on the screen.
  useEffect(() => {
    const ids = links
      .map((l) => (l.href.startsWith("#") ? l.href.slice(1) : null))
      .filter(Boolean) as string[];

    if (!ids.length) return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        let best: IntersectionObserverEntry | null = null;
        for (const e of entries) {
          if (!best || (e.isIntersecting && e.intersectionRatio > (best.intersectionRatio ?? 0))) {
            best = e.isIntersecting ? e : best;
          }
        }
        if (best) {
          setActiveHash(`#${best.target.id}`);
        }
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: [0.25, 0.5, 0.75] }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    const onHash = () => setActiveHash(window.location.hash || "/");
    window.addEventListener("hashchange", onHash, false);
    onHash();

    return () => {
      observerRef.current?.disconnect();
      window.removeEventListener("hashchange", onHash);
    };
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/") setActiveHash(null);
  }, [pathname]);
  
  function handleAnchorClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (!href.startsWith("#")) return;
    e.preventDefault();
    const el = document.getElementById(href.slice(1));
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      if (window.history.pushState) window.history.pushState({}, "", href);
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
            const active = (l.href === "/" && pathname === "/" && !activeHash) || (isAnchor && activeHash === l.href);
            
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
                    // This ID allows Framer Motion to animate the div between different list items.
                    layoutId="nav-spotlight"
                    // A soft, circular gradient creates the spotlight.
                    className="absolute inset-0 rounded-full [background:radial-gradient(circle_at_center,_rgba(255,255,255,0.07)_0%,_rgba(255,255,255,0)_60%)]"
                    // A gentle, non-spring transition for a calm and smooth feel.
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