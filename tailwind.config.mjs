/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ["var(--font-display)", "system-ui", "sans-serif"],
        mono:    ["var(--font-mono)", "monospace"],
        display: ["var(--font-display)", "sans-serif"],
      },
      fontSize: {
        '2xs':    ['8px',  { lineHeight: '1.2' }],
        'label':  ['9px',  { lineHeight: '1.25' }],
        'caption':['10px', { lineHeight: '1.35' }],
      },
      colors: {
        aurora: { cyan: "#22d3ee", purple: "#a855f7" },
      },
      animation: {
        "dot-pulse": "dot-pulse 2s ease infinite",
        "fade-up":   "fadeUp 0.4s ease both",
      },
      keyframes: {
        "dot-pulse": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%":      { opacity: "0.4", transform: "scale(0.7)" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
