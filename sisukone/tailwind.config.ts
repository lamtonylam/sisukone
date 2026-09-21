import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        verge: {
          bg: '#ffffff',
          'bg-inverse': '#000000',
          text: '#000000',
          'text-inverse': '#ffffff',
          accent: '#1076db',
          'accent-hover': '#1d65b8',
          'accent-light': '#daedff',
          border: '#000000',
          rule: '#000000',
        },
        fudis: {
          primary: '#1076db',
          'primary-dark': '#1d65b8',
          'primary-light': '#daedff',
        },
        // Sisu color overrides mapped strictly to neon brutalist palette with fudis primary
        sisu: {
          blue: '#1076db',
          blueHover: '#1d65b8',
          green: '#1076db',
          goal: '#000000',
          accent: '#1076db',
          bg: '#ffffff',
          card: '#ffffff',
          border: '#000000',
        },
      },
      fontFamily: {
        sans: ['var(--font-space-grotesk)', 'Neue Haas Grotesk Display', 'Helvetica Neue', 'Arial', 'sans-serif'],
        serif: ['var(--font-newsreader)', 'Georgia', 'serif'],
        mono: ['var(--font-jetbrains-mono)', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight: '-0.02em',
      },
    },
  },
  plugins: [],
};
export default config;
