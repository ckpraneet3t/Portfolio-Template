"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "#about", label: "About" },
  { href: "#experience", label: "Experience" },
  { href: "#projects", label: "Projects" },
  { href: "#ideas", label: "Ideas" },
  { href: "#learning", label: "Learning" },
  { href: "#research", label: "Research" },
  { href: "#talks", label: "Talks" },
  { href: "#contact", label: "Contact" },
];

export default function Nav() {
  const pathname = usePathname();
  const [activeHash, setActiveHash] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Build a map of hash -> element id (without '#') to observe
  useEffect(() => {
    // Only observe hash sections if we are on a route that contains them (same pathname)
    // Collect ids for links that are in-page anchors
    const ids = links
      .map((l) => (l.href.startsWith("#") ? l.href.slice(1) : null))
      .filter(Boolean) as string[];

    if (!ids.length) return;

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    // IntersectionObserver: we want to mark a section active when its center is near viewport center
    // rootMargin pulls the "active" zone toward the middle of the viewport for nicer UX
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Choose the visible entry with largest intersectionRatio
        let best: IntersectionObserverEntry | null = null;
        for (const e of entries) {
          if (!best) {
            if (e.isIntersecting) best = e;
            continue;
          }
          if (e.isIntersecting && e.intersectionRatio > (best?.intersectionRatio ?? 0)) {
            best = e;
          }
        }
        if (best && best.target && best.isIntersecting) {
          setActiveHash(`#${best.target.id}`);
        }
      },
      {
        root: null,
        rootMargin: "-40% 0px -40% 0px", // active zone roughly the viewport middle
        threshold: [0.25, 0.5, 0.75],
      }
    );

    // Observe existing elements
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    // If user navigates directly to a URL with a hash, reflect that quickly
    const onHash = () => setActiveHash(window.location.hash || null);
    window.addEventListener("hashchange", onHash, false);
    // initialize from current hash
    onHash();

    return () => {
      observerRef.current?.disconnect();
      window.removeEventListener("hashchange", onHash);
    };
  }, [pathname]);

  // When pathname changes, reset the active hash if we're on a different page
  useEffect(() => {
    // If user navigated away to root or blog, clear anchor highlight
    if (!pathname || pathname !== "/") {
      // If pathname is / and there is a hash, keep that; otherwise clear
      // But keep anchor highlight when pathname === '/' (handled by IntersectionObserver)
      // For other routes, clear hash highlight
      if (pathname !== "/") setActiveHash(null);
    } else {
      // keep existing hash
    }
  }, [pathname]);

  // helper to handle same-page anchor clicks with smooth scroll
  function handleAnchorClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (!href.startsWith("#")) return;
    e.preventDefault();
    const id = href.slice(1);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      // update URL hash without causing a jump
      if (window && window.history && window.location.hash !== href) {
        window.history.pushState({}, "", href);
      }
      setActiveHash(href);
    } else {
      // fallback to default behavior if the element not present
      window.location.hash = href;
    }
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 backdrop-blur bg-black/30 border-b border-white/10">
      <nav className="mx-auto max-w-6xl px-[var(--page-padding)] h-16 flex items-center gap-7 text-[0.95rem] tracking-wider2">
        <div className="mr-auto font-display text-lg">AK</div>

        {links.map((l) => {
          // Active detection:
          // - For root: pathname === '/'
          // - For anchors: activeHash matches
          // - For full-routes: pathname === l.href
          const isAnchor = l.href.startsWith("#");
          const active =
            l.href === "/"
              ? pathname === "/"
              : isAnchor
              ? activeHash === l.href
              : pathname === l.href;

          return (
            <Link
              key={l.href}
              href={l.href}
              // For anchors we prevent default & smooth-scroll, else let Next handle navigation
              onClick={(e) => isAnchor && handleAnchorClick(e, l.href)}
              // accessibility: mark the active item
              aria-current={active ? (l.href === "/" || !isAnchor ? "page" : "true") : undefined}
              className={`interactive motion-safe:transition-colors transition-[background-color,color] active:scale-95 px-3 py-1 rounded-md border ${
                active
                  ? "text-white bg-white/30 border-white/40"
                  : "text-white/90 hover:text-white bg-white/15 hover:bg-white/25 border-white/15"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
