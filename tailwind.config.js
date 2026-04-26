/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Andika', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        zh: ['"Noto Serif SC"', 'ui-serif', 'serif'],
      },
      colors: {
        paper: '#faf6f0',
        ink: '#1c1917',
        mute: '#78716c',
        line: '#e7e2d6',
        amber: '#c2410c',
        leaf: '#4d7c0f',
        rose: '#be123c',
      },
      boxShadow: {
        card: '0 1px 0 rgba(28, 25, 23, 0.04), 0 8px 24px -12px rgba(28, 25, 23, 0.12)',
        soft: '0 1px 2px rgba(28, 25, 23, 0.06)',
      },
    },
  },
  plugins: [],
};
