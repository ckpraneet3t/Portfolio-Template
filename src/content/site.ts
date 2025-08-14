export type Project = {
  title: string;
  image: string;
  url: string;
};

export const site = {
  name: 'Ari K.',
  tagline: 'Deep Learning Engineer — alignment, scaling laws, and emergent behavior',
  description: 'Research-driven engineer focused on frontier-scale systems, from data to deployment.',
  url: 'https://example.com',
  social: {
    github: 'https://github.com/arik-labs',
    linkedin: 'https://www.linkedin.com/in/arikelab/',
    email: 'mailto:ari@example.com',
    scholar: 'https://scholar.google.com/'
  }
};

export const projects: Project[] = [
  { title: 'Distilled Reasoners (2025)', image: 'https://images.unsplash.com/photo-1526318472351-c75fcf070305?q=80&w=1600&auto=format&fit=crop', url: '/projects' },
  { title: 'Scaling Laws beyond Power (2024)', image: 'https://images.unsplash.com/photo-1472437774355-71ab6752b434?q=80&w=1600&auto=format&fit=crop', url: '/projects' },
  { title: 'Self-Play RLHF (2024)', image: 'https://images.unsplash.com/photo-1543269664-7eef42226a21?q=80&w=1600&auto=format&fit=crop', url: '/projects' },
  { title: 'Sparse Mixture-of-Agents (2023)', image: 'https://images.unsplash.com/photo-1477378226765-004d8c30a6d9?q=80&w=1600&auto=format&fit=crop', url: '/projects' },
  { title: 'Synthetic Knowledge Flywheel (2023)', image: 'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?q=80&w=1600&auto=format&fit=crop', url: '/projects' },
  { title: 'Alignment Stressors (2022)', image: 'https://images.unsplash.com/photo-1451187620451-311782c9ea5a?q=80&w=1600&auto=format&fit=crop', url: '/projects' }
];

export const highlights = [
  'OpenAI, Alignment Engineer (2023—2025)',
  'DeepMind, Research Engineer (2021—2023)',
  'Stanford MLSys Lab — M.S. (2019—2021)',
  'Scaling, interpretability, tool-use, evals'
];



