import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: '#c7f22dff',
        ink: '#e6e6e6',
        paper: '#0a0a0a'
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui']
      },
      letterSpacing: {
        wider2: '0.08em'
      },
      animation: {
        slowfade: 'slowfade 1.2s ease-out both',
        gradientSlow: 'gradientShift 30s ease infinite'
      },
      keyframes: {
        slowfade: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        gradientShift: {
          '0%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
          '100%': { 'background-position': '0% 50%' }
        }
      }
    }
  },
  plugins: []
};

export default config;


