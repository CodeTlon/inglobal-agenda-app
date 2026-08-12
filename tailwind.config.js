/** @type {import('tailwindcss').Config} */
module.exports = {
  // src/lib incluido: agenda-view.ts arma classNames de estado (bg-blue-500, bg-zinc-300, ...)
  // que si no, no se escanean y NativeWind no genera el CSS para esas clases.
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}', './src/lib/**/*.ts'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        // Misma tipografía que inglobal-site (Manrope headline / Inter cuerpo) —
        // cargadas en src/app/_layout.tsx vía @expo-google-fonts. Sin peso "bold" acá:
        // en RN cada peso es un archivo de fuente distinto, no se sintetiza con
        // font-weight — por eso font-headline siempre es el Manrope 700 (bold-only).
        sans: ['Inter_400Regular'],
        headline: ['Manrope_700Bold'],
      },
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
        // No están en inglobal-site — agregados acá para dejar de mezclar
        // red-600/red-700/green-600 crudos para el mismo "error"/"éxito" en
        // distintas pantallas (login, formularios de catálogos, EventoForm,
        // pair-tv).
        'igb-error': '#dc2626',
        'igb-success': '#16a34a',
      },
    },
  },
  plugins: [],
}
