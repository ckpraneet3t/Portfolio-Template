# Columbus — Minimal Portfolio

A minimal, cinematic personal portfolio inspired by Kogonada's Columbus. Built with Next.js, TypeScript, Tailwind CSS, and Framer Motion.

## Scripts

- `npm run dev` — local development
- `npm run build` — production build
- `npm run export` — static export to `out/`

The project is configured with `output: 'export'` and unoptimized images for fully static hosting.

## Deploy

- Vercel: Import the repo, set framework to Next.js. No extra config required.
- Netlify: Use Next.js build command `npm run export`; publish directory `out`.
- GitHub Pages: Push `out` to `gh-pages` branch; or use Actions to build and deploy.

## Customize

- Update text in `src/app/page.tsx` (name, bio, projects, links).
- Swap images (Unsplash placeholders used now).
- Colors and spacing in `tailwind.config.ts` and `globals.css`.
- Cursor behavior in `src/components/Cursor.tsx`.
- Background style in `src/components/Background.tsx`.

## Accessibility

All animations respect `prefers-reduced-motion`. The custom cursor disables on touch or reduced motion.


