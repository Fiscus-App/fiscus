import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#07091a',
          2: '#0d1222',
          3: '#141c30',
          4: '#1a243d',
          5: '#222e4a',
        },
        gold: {
          DEFAULT: '#d4a843',
          a: 'rgba(212, 168, 67, 0.08)',
          b: 'rgba(212, 168, 67, 0.2)',
          c: 'rgba(212, 168, 67, 0.35)',
        },
        market: {
          green: '#2ed494',
          red: '#ff5252',
        },
        text: {
          primary: '#eef2ff',
          secondary: '#8899bb',
          muted: '#4a5878',
          faint: '#2a3450',
        },
        line: {
          DEFAULT: 'rgba(255, 255, 255, 0.06)',
          2: 'rgba(255, 255, 255, 0.12)',
          3: 'rgba(255, 255, 255, 0.2)',
        },
        accent: {
          blue: '#5b8af5',
          purple: '#a78bfa',
          orange: '#f97316',
          amber: '#f59e0b',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'Courier New', 'monospace'],
      },
      borderColor: {
        DEFAULT: 'rgba(255, 255, 255, 0.06)',
        subtle: 'rgba(255, 255, 255, 0.12)',
        strong: 'rgba(255, 255, 255, 0.2)',
        gold: 'rgba(212, 168, 67, 0.35)',
      },
      animation: {
        'ticker': 'ticker-scroll 32s linear infinite',
        'live-pulse': 'live-pulse 2s infinite',
        'scan': 'scan-line 4.5s linear infinite',
        'fade-up': 'fade-up 0.3s ease forwards',
        'blink': 'blink 0.7s infinite',
      },
    },
  },
  plugins: [],
}

export default config
