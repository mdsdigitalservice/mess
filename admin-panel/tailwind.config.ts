import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg0: '#000000',
        bg1: '#0A0A0B',
        bg2: '#121214',
        bg3: '#1A1A1D',
        fg: '#F4F4F5',
        'fg-2': '#B4B4B8',
        'fg-3': '#6E6E76',
        accent: '#E31F25',
        'accent-press': '#B6191E',
      },
      fontFamily: {
        display: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(227,31,37,.35)',
        'glow-sm': '0 0 12px rgba(227,31,37,.25)',
      },
    },
  },
  plugins: [],
};

export default config;
