"use client";

// Import necessary hooks and components from Framer Motion for animations.
// - motion: The core component to create animated HTML elements (e.g., motion.div).
// - useReducedMotion: A hook to detect if the user prefers reduced motion, for accessibility.
// - useScroll: A hook to track scroll progress.
// - useTransform: A hook to map one value to another (e.g., scroll progress to an element's position).
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
// Import custom components used in this page.
import Background from "@/components/Background"; // Handles the animated background effect.
import Cursor from "@/components/Cursor"; // Handles the custom cursor effect.
import HeroOrb from "@/components/HeroOrb"; // The interactive orb in the hero section.
// Import the Next.js Image component for optimized images.
import Image from "next/image";
import React from "react";

// This object holds all the personal information and links displayed on the page.
// To change the name, tagline, or social links, you only need to edit them here.
const profile = {
  name: "Your Name",
  tagline:
    "A compelling tagline about your professional goals and interests.",
  social: {
    emailAcademic: "mailto:your.academic@university.edu",
    emailPersonal: "mailto:your.personal@email.com",
    github: "https://github.com/your-username",
    linkedin: "https://www.linkedin.com/in/your-profile/",
  },
};

// This is a "variant" object for Framer Motion. It defines animation states.
// 'hidden' is the initial state, and 'show' is the final state.
// Tweaking 'duration' would change the animation speed.
// Changing the 'ease' array would alter the animation's timing curve (e.g., making it bounce more or less).
const framerItem = {
  hidden: { opacity: 1, y: 0, scale: 1 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

// A component that creates a "glitch" text effect.
// It works by layering three copies of the text on top of each other with slight offsets.
function GlitchText({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      {/* The main, top-layer text. */}
      <span className="relative z-10">{children}</span>
      {/* A semi-transparent copy of the text, slightly offset. This creates the first layer of the glitch. */}
      {/* Tweaking 'translate-x' and 'translate-y' would change the distance of the glitch effect. */}
      {/* The 'mix-blend-screen' property affects how the colors of the layers interact. */}
      <span
        aria-hidden
        className="absolute inset-0 -z-0 select-none mix-blend-screen text-accent/60 translate-x-[0.5px] translate-y-[0.5px]"
      >
        {children}
      </span>
      {/* Another semi-transparent copy, offset in the opposite direction for a richer effect. */}
      <span
        aria-hidden
        className="absolute inset-0 -z-0 select-none mix-blend-screen text-ink/20 -translate-x-[0.5px] -translate-y-[0.5px]"
      >
        {children}
      </span>
    </span>
  );
}

/* A component for the small, pill-shaped tags (e.g., for skills).
   It has an interactive animation on hover. */
function Chip({ children }: { children: React.ReactNode }) {
  // Check if the user has requested reduced motion for accessibility.
  const prefersReducedMotion = useReducedMotion();
  // If so, return a static, non-animated version of the chip.
  if (prefersReducedMotion) {
    return (
      <span className="inline-block text-xs px-2 py-1 mr-2 mb-2 rounded-md border border-white/10 bg-[rgba(255,255,255,0.03)] text-[#17323b]/90">
        {children}
      </span>
    );
  }
  // Otherwise, return the animated version using Framer Motion.
  return (
    <motion.span
      // 'whileHover' defines the animation state when the mouse is over the element.
      // Tweaking 'scale' would make it grow more or less.
      // Tweaking 'y' would make it lift higher or lower.
      // 'boxShadow' adds a shadow to enhance the lifting effect.
      whileHover={{ scale: 1.06, y: -4, boxShadow: "0 10px 30px rgba(0,0,0,0.45)", backgroundColor: "rgba(255,255,255,0.06)" }}
      // 'transition' defines the physics of the animation.
      // 'type: "spring"' creates a bouncy effect.
      // Tweaking 'stiffness' and 'damping' would change how bouncy or smooth the animation is. Higher stiffness = faster, bouncier.
      transition={{ type: "spring", stiffness: 300, damping: 18 }}
      style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
      className="inline-block text-xs px-2 py-1 mr-2 mb-2 rounded-md border border-white/10 text-[#17323b]/90"
    >
      {children}
    </motion.span>
  );
}

// A simple styled component for displaying the year, often used in the achievements section.
// Tweaking the colors 'border-[#c9b892]', 'bg-[#f1e6c8]', or 'text-[#17323b]' would change its appearance.
function YearPill({ year }: { year: string }) {
  return (
    <span className="inline-block text-xs px-2 py-1 ml-3 rounded-md border border-[#c9b892] bg-[#f1e6c8] text-[#17323b]">
      {year}
    </span>
  );
}

export default function HomePage() {
  const prefersReducedMotion = useReducedMotion();

  // A reusable card component that has both a hover effect and a subtle parallax scroll effect.
  function MotionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    // This is the base styling for the card. Changing these Tailwind classes will affect all MotionCards.
    const base = `${className} bg-gradient-to-tr from-[#F3EFC8] to-[#efe1c0] border border-[#c9b892] rounded-md p-6 md:p-8 w-full h-full flex flex-col justify-center`;
    // Return a non-animated version if the user prefers reduced motion.
    if (prefersReducedMotion) return <div className={base}>{children}</div>;
    
    // Framer Motion hooks for the parallax scroll effect.
    const { scrollYProgress } = useScroll(); // Tracks the scroll position from 0 (top) to 1 (bottom).
    // 'useTransform' maps the scroll progress to a vertical position ('y').
    // As you scroll from top (0) to bottom (1), the card's 'y' position will move from 0 to -10 pixels.
    // Tweaking '-10' to a larger negative number would make the parallax effect more pronounced.
    const y = useTransform(scrollYProgress, [0, 1], [0, -10]);
    
    return (
      <motion.div
        // Apply the parallax scroll effect.
        style={{ y }}
        // Set the initial animation state.
        initial={{ opacity: 1, y: 0, scale: 1 }}
        // Define the hover animation.
        // Tweaking 'scale' and 'y' changes how much it grows and lifts.
        whileHover={{ scale: 1.01, y: -2, boxShadow: "0 10px 26px rgba(0,0,0,0.06)" }}
        // 'viewport' controls when "whileInView" animations trigger. Not used here for an entry animation, but good to know.
        viewport={{ once: false, amount: 0.3 }}
        // Define the spring physics for the hover animation.
        transition={{ type: "spring", stiffness: 140, damping: 22 }}
        className={base}
      >
        {children}
      </motion.div>
    );
  }

  // A constant for shared styling of inner cards (like those in Experience/Projects).
  // This ensures consistency. Changing this string will update all cards that use it.
  const innerCardClass =
    "border border-[#c9b892] rounded-md p-4 hover:bg-[rgba(0,0,0,0.02)] hover:border-[#eee6d0] transform transition-all duration-200 w-full h-full"; 

  // A constant for the styling of the "View Code" button on project cards.
  const repoButtonClass =
    "inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[#c9b892] hover:bg-[rgba(0,0,0,0.02)] hover:shadow-sm transition-all duration-200 text-sm text-[#17323b]";

  // An array of different background gradients.
  // These are cycled through for various cards to add visual variety.
  // You can add, remove, or change these color strings to alter the page's color palette.
  const subtleVariants = [
    "bg-gradient-to-br from-[#F3EFC8] via-[#F7E9C8] to-[#F1E2B8]",
    "bg-gradient-to-br from-[#FFF6E0] via-[#F9EAC2] to-[#F7E3B0]",
    "bg-gradient-to-br from-[#FFF1E0] via-[#FDE6CA] to-[#F8D9A8]",
    "bg-gradient-to-br from-[#FFFCE8] via-[#F9F0D0] to-[#F0E6C0]",
    "bg-gradient-to-br from-[#FFFBEF] via-[#F7ECD2] to-[#F3E5C0]",
  ];

  // A reusable object for Framer Motion props, applied to all inner cards.
  // This centralizes the animation logic for consistency.
  // 'whileInView' triggers the animation when the element scrolls into view.
  // 'viewport: { once: false }' means the animation can re-trigger every time it enters the screen. Change to 'true' to make it animate only once.
  // 'amount: 0.28' means 28% of the element must be visible to trigger the animation.
  const innerHover = prefersReducedMotion
    ? {}
    : { initial: { opacity: 1, y: 0 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: false, amount: 0.28 }, whileHover: { scale: 1.01, y: -2, boxShadow: "0 8px 22px rgba(0,0,0,0.06)" }, transition: { type: "spring", stiffness: 140, damping: 20 } };

  // A constant for the styling of the smaller contact cards.
  const contactSubClass =
    "border border-[#c9b892] rounded-md p-4 hover:bg-[rgba(0,0,0,0.03)] hover:border-[#eee6d0] transform transition-transform duration-200 min-w-[220px] h-full";

  return (
    // The main container for the entire page.
    // The background gradient is defined here. Changing 'from-[#...]' or 'to-[#...]' will change the overall page color.
    <main className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-[#E6D9B0] to-[#D8C98A] text-[#17323b]">
      <Background />
      <Cursor />

      {/* This is the main content wrapper. 'w-full' makes it span the full width of the screen. */}
      <div className="relative w-full">
        {/* Hero Section */}
        {/* The layout is a grid. On medium screens and up ('md:'), it becomes a two-column grid. */}
        {/* Tweaking 'md:grid-cols-[1.1fr_1.3fr]' would change the relative widths of the two columns. */}
        {/* 'gap-0' removes space between grid items. 'px-6 md:px-12' adds horizontal padding. */}
        <section className="grid md:grid-cols-[1.1fr_1.3fr] gap-0 items-center pt-12 md:pt-16 pb-4 px-6 md:px-12">
          {/* The HeroOrb component is placed here. 'order-2 md:order-1' makes it appear second on mobile but first on desktop. */}
          <div className="order-2 md:order-1">
            <HeroOrb />
          </div>
          <div className="order-1 md:order-2">
            {/* The main heading (profile name). */}
            <motion.h1
              variants={framerItem}
              initial={prefersReducedMotion ? undefined : "hidden"}
              animate={prefersReducedMotion ? undefined : "show"}
              className="font-display text-5xl md:text-6xl text-[#17323b]"
            >
              <GlitchText>{profile.name}</GlitchText>
            </motion.h1>
            {/* The tagline paragraph. */}
            <motion.p
              variants={framerItem}
              initial={prefersReducedMotion ? undefined : "hidden"}
              animate={prefersReducedMotion ? undefined : "show"}
              className="mt-3 text-base md:text-lg text-[#17323b]/90 max-w-prose"
            >
              <GlitchText>{profile.tagline}</GlitchText>
            </motion.p>

            {/* Quick navigation links. This is a grid that stacks 2x2 on mobile and 4x1 on desktop. */}
            {/* Changing 'grid-cols-2 md:grid-cols-4' would alter this layout. 'gap-0' removes spacing. */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-0">
              {[
                { t: "About", h: "#about" },
                { t: "Experience", h: "#experience" },
                { t: "Projects", h: "#projects" },
                { t: "Learning & Ideas", h: "#learning" },
              ].map((x, i) => (
                <motion.a
                  key={i}
                  href={x.h}
                  className="block bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.035)] border border-white/8 rounded-md p-3 text-[#17323b]/90 transition-colors w-full text-center h-full flex items-center justify-center"
                  // A simple spring animation on hover.
                  whileHover={{ scale: 1.03, y: -4 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {x.t}
                </motion.a>
              ))}
            </div>
          </div>
        </section>

        {/* This container wraps all the main content sections. */}
        {/* 'py-0' means there is no vertical padding, so sections will sit flush against each other. */}
        {/* Change 'py-0' to something like 'space-y-4' or 'py-8' to add vertical spacing between sections. */}
        <div className="py-0">
          {/* About Section */}
          <section id="about" className="flex items-start py-0">
            {/* Using the reusable MotionCard for consistent styling and animation. */}
            <MotionCard>
              {/* This grid is 1-column on mobile and 2-column on desktop ('md:grid-cols-2'). 'gap-0' removes space between text and image. */}
              <div className="grid md:grid-cols-2 gap-0 items-start">
                <motion.div
                  variants={framerItem}
                  initial={prefersReducedMotion ? undefined : "hidden"}
                  // 'whileInView' triggers the animation when this element scrolls into view.
                  whileInView={prefersReducedMotion ? undefined : "show"}
                  // 'viewport' settings mean the animation triggers once when 20% of the element is visible from the bottom.
                  viewport={{ once: true, margin: "-20%" }}
                  className="max-w-3xl"
                >
                  <h2 className="font-display text-3xl md:text-4xl text-[#73123b] mb-4">
                    <GlitchText>About</GlitchText>
                  </h2>
                  <p className="mt-0 leading-relaxed text-[#17323b]/90">
                    [Your Degree] in [Your Field of Study] at [Your University] (CGPA: X.XX, expected YYYY).
                    My focus areas include: [Your Area 1], [Your Area 2], [Your Area 3], and [Your Area 4].
                  </p>
                </motion.div>

                <motion.div
                  variants={framerItem}
                  initial={prefersReducedMotion ? undefined : "hidden"}
                  whileInView={prefersReducedMotion ? undefined : "show"}
                  viewport={{ once: true, margin: "-20%" }}
                  // 'aspect-[4/3]' forces a 4:3 aspect ratio for the image container.
                  className="relative aspect-[4/3] overflow-hidden rounded-md"
                >
                  {/* Next.js Image component. 'fill' makes it fill the parent container. */}
                  {/* 'object-cover' ensures the image covers the container without distortion. */}
                  {/* Replace with a relevant image for your portfolio. */}
                  <Image
                    src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop"
                    alt="A descriptive alt text for your image"
                    fill
                    className="object-cover"
                    priority // Loads the image eagerly as it's likely to be visible on page load.
                    sizes="(min-width: 768px) 28rem, 100vw"
                  />
                </motion.div>
              </div>
            </MotionCard>
          </section>

          {/* Experience Section */}
          <section id="experience" className="flex items-start py-0">
            <MotionCard>
              <motion.h2
                variants={framerItem}
                initial={prefersReducedMotion ? undefined : "hidden"}
                whileInView={prefersReducedMotion ? undefined : "show"}
                viewport={{ once: true }}
                className="font-display text-3xl md:text-4xl mb-4 text-[#17323b]"
              >
                Experience
              </motion.h2>

              {/* A flex container for the list of experience items. 'gap-4' adds space between them. */}
              <div className="flex flex-col gap-4 text-[#17323b]/90 w-full h-full">
                {/* Experience Item 1 */}
                {/* The 'innerHover' object is spread here to apply the consistent hover/animation effect. */}
                {/* The background gradient is picked from the 'subtleVariants' array. */}
                <motion.div {...innerHover} className={`${subtleVariants[0]} ${innerCardClass}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium text-[#17323b]">Company Name / Organization</div>
                      <div className="text-sm text-[#17323b]/80">Your Role (e.g., Project Intern)</div>
                      <div className="mt-3">
                        <Chip>Skill 1</Chip>
                        <Chip>Skill 2</Chip>
                        <Chip>Skill 3</Chip>
                      </div>
                    </div>
                    <div className="text-right text-xs text-[#17323b]/70">
                      City, Country
                      <div>Month YYYY — Present</div>
                    </div>
                  </div>
                  <ul className="mt-3 list-disc list-inside space-y-2 text-[#17323b]/85">
                    <li>
                      A concise description of your key responsibility or accomplishment in this role. Focus on impact and the technologies used.
                    </li>
                  </ul>
                </motion.div>

                {/* Experience Item 2 */}
                <motion.div {...innerHover} className={`${subtleVariants[1]} ${innerCardClass}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium text-[#17323b]">Previous Company Name</div>
                      <div className="text-sm text-[#17323b]/80">Your Previous Role</div>
                      <div className="mt-3">
                        <Chip>Tech A</Chip>
                        <Chip>Tech B</Chip>
                        <Chip>Tech C</Chip>
                      </div>
                    </div>
                    <div className="text-right text-xs text-[#17323b]/70">
                      City, Country
                      <div>Month YYYY — Month YYYY</div>
                    </div>
                  </div>
                  <ul className="mt-3 list-disc list-inside space-y-2 text-[#17323b]/85">
                    <li>
                      Another achievement-oriented bullet point describing your contributions and the value you provided.
                    </li>
                  </ul>
                </motion.div>

                {/* Experience Item 3 */}
                <motion.div {...innerHover} className={`${subtleVariants[2]} ${innerCardClass}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium text-[#17323b]">Research Center or Academic Group</div>
                      <div className="text-sm text-[#17323b]/80">Research Role</div>
                      <div className="mt-3">
                        <Chip>Field 1</Chip>
                        <Chip>Field 2</Chip>
                        <Chip>Tool 3</Chip>
                      </div>
                    </div>
                    <div className="text-right text-xs text-[#17323b]/70">
                      Remote / On-site
                      <div>Month YYYY — Month YYYY</div>
                    </div>
                  </div>
                  <ul className="mt-3 list-disc list-inside space-y-2 text-[#17323b]/85">
                    <li>
                      Description of research contributions, papers published, or projects developed.
                    </li>
                  </ul>
                </motion.div>
              </div>
            </MotionCard>
          </section>

          {/* Projects Section */}
          <section id="projects" className="flex items-start py-0">
            <MotionCard>
              <motion.h2 variants={framerItem} initial={prefersReducedMotion ? undefined : "hidden"} whileInView={prefersReducedMotion ? undefined : "show"} viewport={{ once: true }} className="font-display text-3xl md:text-4xl mb-4 text-[#17323b]">
                Projects
              </motion.h2>

              {/* This grid shows 1 project per row on mobile, and 2 per row on desktop ('md:grid-cols-2'). */}
              {/* 'gap-4' adds space between the project cards. */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full h-full">
                {/* Project 1 */}
                <motion.div {...innerHover} className={`${subtleVariants[0]} ${innerCardClass}`}>
                  <div className="flex items-start justify-between gap-4 w-full">
                    <div className="flex-1">
                      <div className="font-medium text-[#17323b]">Project Title 1</div>
                      <div className="mt-3">
                        <Chip>Tech 1</Chip>
                        <Chip>Tech 2</Chip>
                        <Chip>Tech 3</Chip>
                      </div>
                    </div>
                    <div className="text-right">
                      <a href="https://github.com/your-username/project-repo-1" target="_blank" rel="noreferrer" className={repoButtonClass}>
                        {/* SVG Icon for GitHub */}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 .5C5.73.5.98 5.25.98 11.52c0 4.7 3.04 8.69 7.27 10.09.53.1.72-.23.72-.5 0-.25-.01-.92-.01-1.8-2.96.64-3.59-1.27-3.59-1.27-.48-1.2-1.17-1.52-1.17-1.52-.96-.66.07-.65.07-.65 1.07.07 1.64 1.1 1.64 1.1.94 1.62 2.47 1.15 3.07.88.1-.69.37-1.15.67-1.41-2.37-.27-4.86-1.19-4.86-5.28 0-1.17.42-2.13 1.1-2.88-.11-.27-.48-1.37.11-2.86 0 0 .89-.28 2.9 1.1.84-.24 1.74-.36 2.64-.36s1.8.12 2.64.36c2.01-1.38 2.9-1.1 2.9-1.1.59 1.49.22 2.59.11 2.86.68.75 1.1 1.7 1.1 2.88 0 4.1-2.5 5-4.88 5.27.38.33.71.98.71 1.98 0 1.43-.01 2.58-.01 2.93 0 .28.19.61.73.5 4.22-1.4 7.26-5.39 7.26-10.09C23.02 5.25 18.27.5 12 .5z" fill="currentColor"/></svg>
                        <span>View Code</span>
                      </a>
                    </div>
                  </div>
                  <ul className="mt-3 text-sm space-y-2 text-[#17323b]/90 list-disc list-inside">
                    <li>A short, clear description of what this project does and the problem it solves.</li>
                  </ul>
                </motion.div>

                {/* Project 2 */}
                <motion.div {...innerHover} className={`${subtleVariants[1]} ${innerCardClass}`}>
                  <div className="flex items-start justify-between gap-4 w-full">
                    <div className="flex-1">
                      <div className="font-medium text-[#17323b]">Project Title 2</div>
                      <div className="mt-3">
                        <Chip>Tool A</Chip>
                        <Chip>Framework B</Chip>
                        <Chip>Library C</Chip>
                      </div>
                    </div>
                    <div className="text-right">
                      <a href="https://github.com/your-username/project-repo-2" target="_blank" rel="noreferrer" className={repoButtonClass}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 .5C5.73.5.98 5.25.98 11.52c0 4.7 3.04 8.69 7.27 10.09.53.1.72-.23.72-.5 0-.25-.01-.92-.01-1.8-2.96.64-3.59-1.27-3.59-1.27-.48-1.2-1.17-1.52-1.17-1.52-.96-.66.07-.65.07-.65 1.07.07 1.64 1.1 1.64 1.1.94 1.62 2.47 1.15 3.07.88.1-.69.37-1.15.67-1.41-2.37-.27-4.86-1.19-4.86-5.28 0-1.17.42-2.13 1.1-2.88-.11-.27-.48-1.37.11-2.86 0 0 .89-.28 2.9 1.1.84-.24 1.74-.36 2.64-.36s1.8.12 2.64.36c2.01-1.38 2.9-1.1 2.9-1.1.59 1.49.22 2.59.11 2.86.68.75 1.1 1.7 1.1 2.88 0 4.1-2.5 5-4.88 5.27.38.33.71.98.71 1.98 0 1.43-.01 2.58-.01 2.93 0 .28.19.61.73.5 4.22-1.4 7.26-5.39 7.26-10.09C23.02 5.25 18.27.5 12 .5z" fill="currentColor"/></svg>
                        <span>View Code</span>
                      </a>
                    </div>
                  </div>
                  <ul className="mt-3 text-sm space-y-2 text-[#17323b]/90 list-disc list-inside">
                    <li>Highlighting a key feature or the technology stack used in this project.</li>
                  </ul>
                </motion.div>
              </div>
            </MotionCard>
          </section>

          {/* Technical Skills Section */}
          <section id="skills" className="flex items-start py-0">
            <MotionCard className={`${subtleVariants[2]} `}>
              <motion.h2 variants={framerItem} initial={prefersReducedMotion ? undefined : "hidden"} whileInView={prefersReducedMotion ? undefined : "show"} viewport={{ once: true }} className="font-display text-3xl md:text-4xl mb-4 text-[#17323b]">
                Technical Skills
              </motion.h2>

              <div className="flex flex-col gap-4 w-full h-full">
                <motion.div {...innerHover} className={innerCardClass}>
                  <div className="font-medium text-[#17323b]">Languages</div>
                  <div className="mt-0 text-[#17323b]/90">Python, C++, JavaScript, SQL</div>
                </motion.div>

                <motion.div {...innerHover} className={innerCardClass}>
                  <div className="font-medium text-[#17323b]">Frameworks & Libraries</div>
                  <div className="mt-0 text-[#17323b]/90">PyTorch, TensorFlow, HuggingFace, Scikit-learn, OpenCV, React, Node.js</div>
                </motion.div>

                <motion.div {...innerHover} className={innerCardClass}>
                  <div className="font-medium text-[#17323b]">Tools & Platforms</div>
                  <div className="mt-0 text-[#17323b]/90">Git, Docker, AWS, Google Cloud, Vercel</div>
                </motion.div>

                <motion.div {...innerHover} className={innerCardClass}>
                  <div className="font-medium text-[#17323b]">Domains of Interest</div>
                  <div className="mt-0 text-[#17323b]/90">Machine Learning, Computer Vision, NLP, Full-Stack Development</div>
                </motion.div>
              </div>
            </MotionCard>
          </section>

          {/* Milestones & Achievements Section */}
          <section id="achievements" className="flex items-start py-0">
            <MotionCard>
              <motion.h2
                variants={framerItem}
                initial={prefersReducedMotion ? undefined : "hidden"}
                whileInView={prefersReducedMotion ? undefined : "show"}
                viewport={{ once: true }}
                className="font-display text-3xl md:text-4xl mb-4 text-[#17323b]"
              >
                Milestones & Achievements
              </motion.h2>

              {/* A grid that is 1-column on mobile and 3-column on desktop ('md:grid-cols-3'). */}
              {/* 'gap-6' adds a larger space between the achievement cards. */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div {...innerHover} className="rounded-md p-6 bg-gradient-to-br from-[#F3EFC8] to-[#F7E9C8] border border-[#c9b892]">
                  <div className="flex items-start gap-4">
                    <div className="text-yellow-300 text-2xl">🏆</div>
                    <div className="flex-1">
                      <div className="inline-flex items-center">
                        <span className="text-[#17323b] font-medium mr-2">Award / Hackathon</span>
                        <YearPill year="2025" />
                      </div>
                      <div className="mt-3 text-lg text-[#17323b] font-semibold">1st Place — Hackathon Name '25</div>
                      <div className="mt-3 text-sm text-[#17323b]/85"></div>
                    </div>
                  </div>
                </motion.div>

                <motion.div {...innerHover} className="rounded-md p-6 bg-gradient-to-br from-[#FFF6E0] to-[#F7E3B0] border border-[#c9b892]">
                  <div className="flex items-start gap-4">
                    <div className="text-yellow-300 text-2xl">🏅</div>
                    <div className="flex-1">
                      <div className="inline-flex items-center">
                        <span className="text-[#17323b] font-medium mr-2">Certification</span>
                        <YearPill year="2024" />
                      </div>
                      <div className="mt-3 text-lg text-[#17323b] font-semibold">Official Certification Name</div>
                      <div className="mt-3 text-sm text-[#17323b]/85"></div>
                    </div>
                  </div>
                </motion.div>

                <motion.div {...innerHover} className="rounded-md p-6 bg-gradient-to-br from-[#FFF1E0] to-[#F8D9A8] border border-[#c9b892]">
                  <div className="flex items-start gap-4">
                    <div className="text-yellow-300 text-2xl">⭐</div>
                    <div className="flex-1">
                      <div className="inline-flex items-center">
                        <span className="text-[#17323b] font-medium mr-2">Publication / Talk</span>
                        <YearPill year="2023" />
                      </div>
                      <div className="mt-3 text-lg text-[#17323b] font-semibold">Title of Paper or Conference Talk</div>
                      <div className="mt-3 text-sm text-[#17323b]/85"></div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </MotionCard>
          </section>

          {/* Learning & Ideas Section */}
          <section id="learning" className="flex items-start py-0">
            <MotionCard>
              <motion.h2
                variants={framerItem}
                initial={prefersReducedMotion ? undefined : "hidden"}
                whileInView={prefersReducedMotion ? undefined : "show"}
                viewport={{ once: true }}
                className="font-display text-3xl md:text-4xl mb-4 text-[#17323b]"
              >
                Learning & Ideas
              </motion.h2>
              <div className="flex flex-col gap-4 h-full">
                {[
                  "Exploring [new technology or field]",
                  "Developing projects in [specific area]",
                  "Reading about [interesting concept]",
                  "Fine-tuning models for [a specific task]",
                ].map((x, i) => (
                  // Each item is a motion.div to receive the standard 'innerHover' animation props.
                  // The background gradient is cycled using the modulo operator '%'. This ensures that if you add more items than gradients, the colors will repeat gracefully.
                  <motion.div key={i} {...innerHover} className={`${subtleVariants[i % subtleVariants.length]} ${innerCardClass}`}>
                    {x}
                  </motion.div>
                ))}
              </div>
            </MotionCard>
          </section>

          {/* Contact Section */}
          <section id="contact" className="flex items-start py-0">
            <MotionCard className={`${subtleVariants[3]} p-6`}>
              <motion.h2 variants={framerItem} initial={prefersReducedMotion ? undefined : "hidden"} whileInView={prefersReducedMotion ? undefined : "show"} viewport={{ once: true }} className="font-display text-3xl md:text-4xl mb-4 text-[#17323b]">
                Contact
              </motion.h2>

              {/* This container arranges the contact cards. */}
              {/* 'flex-row' makes them horizontal. 'flex-wrap' allows them to wrap to the next line on smaller screens. */}
              {/* 'gap-4' adds space between them. */}
              <div className="flex flex-row flex-wrap gap-4 h-full">
                <motion.div {...innerHover} className={contactSubClass}>
                  <div className="font-medium text-[#17323b] mb-2">Academic Email</div>
                  <a href={profile.social.emailAcademic} className="hover:text-[#17323b] transition-colors">your.academic@university.edu</a>
                </motion.div>

                <motion.div {...innerHover} className={contactSubClass}>
                  <div className="font-medium text-[#17323b] mb-2">Personal Email</div>
                  <a href={profile.social.emailPersonal} className="hover:text-[#17323b] transition-colors">your.personal@email.com</a>
                </motion.div>

                <motion.div {...innerHover} className={contactSubClass}>
                  <div className="font-medium text-[#17323b] mb-2">GitHub</div>
                  <a href={profile.social.github} target="_blank" rel="noreferrer" className="hover:text-[#17323b] transition-colors">@{profile.social.github.split("/").pop()}</a>
                </motion.div>

                <motion.div {...innerHover} className={contactSubClass}>
                  <div className="font-medium text-[#17323b] mb-2">LinkedIn</div>
                  <a href={profile.social.linkedin} target="_blank" rel="noreferrer" className="hover:text-[#17323b] transition-colors">{profile.social.linkedin.split("/").filter(Boolean).pop()}</a>
                </motion.div>
              </div>
            </MotionCard>
          </section>

          {/* Footer Section */}
          {/* 'flex-col md:flex-row' makes it a vertical stack on mobile and a horizontal row on desktop. */}
          {/* 'justify-between' spaces the copyright and the nav links to opposite ends on desktop. */}
          <footer className="py-14 border-t border-black/10 text-sm flex flex-col md:flex-row items-center justify-between gap-4 px-6 md:px-12">
            <p className="tracking-wider2">© {new Date().getFullYear()} {profile.name}</p>
            <nav className="flex items-center gap-4">
              <a className="hover:text-ink/80 transition-colors" href="#projects">Projects</a>
              <a className="hover:text-ink/80 transition-colors" href={profile.social.github} target="_blank" rel="noreferrer">GitHub</a>
              <a className="hover:text-ink/80 transition-colors" href={profile.social.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
              <a className="hover:text-ink/80 transition-colors" href={profile.social.emailPersonal}>Email</a>
            </nav>
          </footer>
        </div>
      </div>
    </main>
  );
}