"use client";

import { motion, useReducedMotion } from "framer-motion";
import Background from "@/components/Background";
import Cursor from "@/components/Cursor";
import HeroOrb from "@/components/HeroOrb";
import Image from "next/image";
import { site, projects } from "@/content/site";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } }
};

function GlitchText({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10">{children}</span>
      <span aria-hidden className="absolute inset-0 -z-0 select-none mix-blend-screen text-accent/60 translate-x-[0.5px] translate-y-[0.5px]">{children}</span>
      <span aria-hidden className="absolute inset-0 -z-0 select-none mix-blend-screen text-ink/20 -translate-x-[0.5px] -translate-y-[0.5px]">{children}</span>
    </span>
  );
}

export default function HomePage() {
  const prefersReducedMotion = useReducedMotion();

  /**
   * MotionCard:
   * - Fully opaque dark panel so background grid won't show through.
   * - Expands sidewards (scaleX) when in view.
   * - Respects reduced-motion.
   */
  function MotionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    // Solid dark opaque panel to hide background grid entirely
    const opaqueClass = `${className} bg-[#3f403d] border border-white/12 rounded-md p-6 md:p-8`;

    if (prefersReducedMotion) {
      return <div className={opaqueClass}>{children}</div>;
    }

    return (
      <motion.div
        initial={{ scaleX: 0.99, scaleY: 1, opacity: 0.98 }}
        whileInView={{ scaleX: 1.06, scaleY: 1, opacity: 1 }}
        viewport={{ once: false, amount: 0.35 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={opaqueClass}
      >
        {children}
      </motion.div>
    );
  }

  // class used for smaller inner cards (also opaque)
  const innerCardClass = "bg-[#8c8c8c] border border-white/10 rounded-md p-6 hover:bg-[rgb(18,18,18)] transition-colors";

  // class for hero quick links (opaque)
  const heroLinkClass = "block bg-[#8c8c8c] hover:bg-[rgb(18,18,18)] border border-white/12 rounded-md p-4 text-white/90 transition-colors";

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-paper text-ink">
      <Background />
      <Cursor />

      {/* Page wrapper */}
      <div className="relative w-full px-[var(--page-padding)]">
        {/* Hero */}
        <section className="grid md:grid-cols-[1.1fr_1.3fr] gap-6 items-center pt-12 md:pt-16 pb-4">
          <div className="order-2 md:order-1">
            <HeroOrb />
          </div>
          <div className="order-1 md:order-2">
            <motion.h1 variants={item} initial={prefersReducedMotion ? undefined : "hidden"} animate={prefersReducedMotion ? undefined : "show"} className="font-display text-5xl md:text-6xl text-white">
              <GlitchText>{site.name}</GlitchText>
            </motion.h1>
            <motion.p variants={item} initial={prefersReducedMotion ? undefined : "hidden"} animate={prefersReducedMotion ? undefined : "show"} className="mt-3 text-base md:text-lg text-white/90 max-w-prose">
              <GlitchText>{site.tagline}</GlitchText>
            </motion.p>
            <div className="mt-6 grid md:grid-cols-2 gap-4">
              {[{ t: "Experience", h: "#experience" }, { t: "Projects", h: "#projects" }, { t: "Ideas", h: "#ideas" }, { t: "Learning", h: "#learning" }].map((x, i) => (
                <a key={i} href={x.h} className={heroLinkClass}>
                  {x.t}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Sections Container: Removed gap-8 to stack sections directly */}
        <div className="py-20 md:py-28">
          {/* About */}
          <section id="about">
            <MotionCard>
              <div className="grid md:grid-cols-2 gap-16 items-start">
                <motion.div
                  variants={item}
                  initial={prefersReducedMotion ? undefined : "hidden"}
                  whileInView={prefersReducedMotion ? undefined : "show"}
                  viewport={{ once: true, margin: "-20%" }}
                  className="max-w-3xl"
                >
                  <h2 className="font-display text-3xl md:text-4xl text-white"><GlitchText>About</GlitchText></h2>
                  <p className="mt-4 leading-relaxed text-white/90">
                    Engineer focused on alignment, interpretability, and scalable training. I build systems that move from
                    prototype to production: data pipelines, distributed trainers, eval harnesses, and safety-critical observability.
                    Previously OpenAI Alignment, DeepMind Research; M.S. at Stanford MLSys.
                  </p>
                  <p className="mt-3 text-white/80">Skills: PyTorch, JAX, CUDA, Triton, RLHF, Transformers, MoE, Evaluations, Toolformer, Agents.</p>
                </motion.div>

                <motion.div
                  variants={item}
                  initial={prefersReducedMotion ? undefined : "hidden"}
                  whileInView={prefersReducedMotion ? undefined : "show"}
                  viewport={{ once: true, margin: "-20%" }}
                  className="relative aspect-[4/3] overflow-hidden rounded-md"
                >
                  <Image
                    src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop"
                    alt="Architectural still"
                    fill
                    className="object-cover"
                    priority
                    sizes="(min-width: 768px) 28rem, 100vw"
                  />
                </motion.div>
              </div>
            </MotionCard>
          </section>

          {/* Experience (in-page) */}
          <section id="experience">
            <MotionCard>
              <motion.h2 variants={item} initial={prefersReducedMotion ? undefined : "hidden"} whileInView={prefersReducedMotion ? undefined : "show"} viewport={{ once: true }} className="font-display text-3xl md:text-4xl mb-4 text-white">Experience</motion.h2>
              <ul className="grid md:grid-cols-3 gap-6 text-white/90">
                <li className={innerCardClass}>DeepMind — Research Engineer (2021—2025)</li>
                <li className={innerCardClass}>OpenAI — Alignment Engineer (2023—2024)</li>
                <li className={innerCardClass}>Stanford — M.S. Computer Science (MLSys)</li>
              </ul>
            </MotionCard>
          </section>

          {/* Projects */}
          <section id="projects">
            <MotionCard>
              <motion.h2 variants={item} initial={prefersReducedMotion ? undefined : "hidden"} whileInView={prefersReducedMotion ? undefined : "show"} viewport={{ once: true }} className="font-display text-3xl md:text-4xl mb-6 text-white">Projects</motion.h2>
              <div className="grid md:grid-cols-4 gap-6">
                {projects.slice(0, 8).map((p, i) => (
                  <a key={i} href={p.url} className="bg-[#0b0b0b] border border-white/10 rounded-md overflow-hidden hover:bg-[rgb(18,18,18)] transition-colors">
                    <div className="relative aspect-[4/3]">
                      <Image src={p.image} alt={p.title} fill className="object-cover" />
                    </div>
                    <div className="p-3 text-sm text-white/90">{p.title}</div>
                  </a>
                ))}
              </div>
            </MotionCard>
          </section>

          {/* Ideas */}
          <section id="ideas">
            <MotionCard>
              <motion.h2 variants={item} initial={prefersReducedMotion ? undefined : "hidden"} whileInView={prefersReducedMotion ? undefined : "show"} viewport={{ once: true }} className="font-display text-3xl md:text-4xl mb-4 text-white">Ideas</motion.h2>
              <ul className="grid md:grid-cols-4 gap-6 text-white/90">
                {["Latent Curriculum", "Self-Distilled Evals", "Neural Flight Recorder", "Agentic Workflows"].map((x, i) => (
                  <li key={i} className={innerCardClass}>{x}</li>
                ))}
              </ul>
            </MotionCard>
          </section>

          {/* Learning */}
          <section id="learning">
            <MotionCard>
              <motion.h2 variants={item} initial={prefersReducedMotion ? undefined : "hidden"} whileInView={prefersReducedMotion ? undefined : "show"} viewport={{ once: true }} className="font-display text-3xl md:text-4xl mb-4 text-white">Learning</motion.h2>
              <ul className="grid md:grid-cols-4 gap-6 text-white/90">
                {["Neural ODEs", "Mechanistic Interpretability", "Triton Kernels", "Distributed Training"].map((x, i) => (
                  <li key={i} className={innerCardClass}>{x}</li>
                ))}
              </ul>
            </MotionCard>
          </section>

          {/* Research/resources condensed */}
          <section id="research">
            <MotionCard>
              <motion.h2
                variants={item}
                initial={prefersReducedMotion ? undefined : "hidden"}
                whileInView={prefersReducedMotion ? undefined : "show"}
                viewport={{ once: true }}
                className="font-display text-3xl md:text-4xl mb-6 text-white"
              >
                <GlitchText>Resources</GlitchText>
              </motion.h2>
              <div id="resources" className="grid md:grid-cols-4 gap-6">
                {[{ t: "Slingshots", d: "Fast grants + support to turn research into startups/open infra." },
                  { t: "Moonshots", d: "Seed/multi-year labs aimed at species-scale challenges." },
                  { t: "Collaborations", d: "Work with labs to ship research with real-world impact." },
                  { t: "Open Source", d: "Releasing tools and methods for the broader research community." }].map((r, i) => (
                  <div key={i} className={`${innerCardClass} p-6` /* ensure padding */}>
                    <div className="font-medium text-white">{r.t}</div>
                    <div className="text-sm mt-2 text-white/85">{r.d}</div>
                  </div>
                ))}
              </div>
            </MotionCard>
          </section>

          {/* Talks */}
          <section id="talks">
            <MotionCard>
              <motion.h2 variants={item} initial={prefersReducedMotion ? undefined : "hidden"} whileInView={prefersReducedMotion ? undefined : "show"} viewport={{ once: true }} className="font-display text-3xl md:text-4xl mb-4 text-white">Talks</motion.h2>
              <ul className="grid md:grid-cols-4 gap-6 text-white/90">
                {["NeurIPS 2024: Scaling Laws Beyond Power", "ICML 2023: Self-Play RLHF", "ICLR 2023: Sparse MoE Training", "Stanford MLSys Seminar 2025"].map((x, i) => (
                  <li key={i} className={innerCardClass}>{x}</li>
                ))}
              </ul>
            </MotionCard>
          </section>

          {/* Contact */}
          <section id="contact">
            <MotionCard>
              <motion.h2 variants={item} initial={prefersReducedMotion ? undefined : "hidden"} whileInView={prefersReducedMotion ? undefined : "show"} viewport={{ once: true }} className="font-display text-3xl md:text-4xl mb-4 text-white">Contact</motion.h2>
              <div className="grid md:grid-cols-4 gap-6 text-white/90">
                <div className={innerCardClass}>
                  <div className="font-medium text-white mb-2">Email</div>
                  <a href="mailto:ari@example.com" className="hover:text-white transition-colors">ari@example.com</a>
                </div>
                <div className={innerCardClass}>
                  <div className="font-medium text-white mb-2">GitHub</div>
                  <a href="https://github.com/arik-labs" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">@arik-labs</a>
                </div>
                <div className={innerCardClass}>
                  <div className="font-medium text-white mb-2">LinkedIn</div>
                  <a href="https://linkedin.com/in/arik-labs" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">@arik-labs</a>
                </div>
                <div className={innerCardClass}>
                  <div className="font-medium text-white mb-2">Twitter</div>
                  <a href="https://twitter.com/arik-labs" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">@arik-labs</a>
                </div>
              </div>
            </MotionCard>
          </section>
        </div>

        {/* Footer */}
        <footer className="py-14 border-t border-black/10 text-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="tracking-wider2">© {new Date().getFullYear()} {site.name}</p>
          <nav className="flex items-center gap-6">
            <a className="hover:text-ink/80 transition-colors" href="#projects">Projects</a>
            <a className="hover:text-ink/80 transition-colors" href={site.social.github} target="_blank" rel="noreferrer">GitHub</a>
            <a className="hover:text-ink/80 transition-colors" href={site.social.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
            <a className="hover:text-ink/80 transition-colors" href={site.social.email}>Email</a>
          </nav>
        </footer>
      </div>
    </main>
  );
}