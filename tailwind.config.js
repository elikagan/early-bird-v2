/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-jetbrains-mono)', '"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
        mono: ['var(--font-jetbrains-mono)', '"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["light", "dark"],
    logs: false,
  },
};
