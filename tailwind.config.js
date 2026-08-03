/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Mismos tokens que inglobal-site/tailwind.config.ts — InGlobal Design System.
        'igb-yellow': '#f5d100',
        'igb-yellow-dark': '#6f5d00',
        'igb-navy': '#1C357F',
        'igb-on-yellow': '#221b00',
        'igb-secondary': '#575d78',
        'igb-surface': '#f8f9fa',
        'igb-surface-low': '#f3f4f5',
        'igb-surface-high': '#e7e8e9',
        'igb-surface-highest': '#e1e3e4',
        'igb-on-surface': '#191c1d',
        'igb-outline': '#cfc6ab',
      },
    },
  },
  plugins: [],
}
