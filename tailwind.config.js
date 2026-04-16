/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./public/design-system.html",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-jetbrains-mono)', '"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
        mono: ['var(--font-jetbrains-mono)', '"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
        readable: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        eb: {
          black: '#1a1a1a',
          text: '#2a2a2a',
          muted: '#666666',
          light: '#999999',
          border: '#e0e0e0',
          bg: '#FAFAF6',
          white: '#ffffff',
          pop: '#D64000',
          'pop-bg': '#FEF7F2',
          'pop-light': '#FFF0E8',
          green: '#22C55E',
          amber: '#EAB308',
          red: '#DC2626',
        },
      },
      fontSize: {
        'eb-hero':    ['32px', { lineHeight: '1.15', fontWeight: '700' }],
        'eb-display': ['24px', { lineHeight: '1.2',  fontWeight: '700' }],
        'eb-title':   ['17px', { lineHeight: '1.3',  fontWeight: '700' }],
        'eb-body':    ['15px', { lineHeight: '1.7',  fontWeight: '400' }],
        'eb-caption':  ['13px', { lineHeight: '1.3',  fontWeight: '400' }],
        'eb-meta':    ['12px', { lineHeight: '1.4',  fontWeight: '400' }],
        'eb-micro':   ['11px',  { lineHeight: '1.4',  fontWeight: '400' }],
      },
    },
  },
  plugins: [],
};
