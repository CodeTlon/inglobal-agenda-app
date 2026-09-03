// Mismos valores que las clases `igb-*` de tailwind.config.js. Ionicons y
// ActivityIndicator no aceptan className — necesitan el hex directo — así
// que estaban duplicados a mano en ~15 archivos. Central acá para que no
// puedan divergir del tema si cambia un color allá.
export const colors = {
  yellow: '#f5d100',
  yellowDark: '#6f5d00',
  navy: '#1C357F',
  onYellow: '#221b00',
  secondary: '#575d78',
  surface: '#f8f9fa',
  surfaceLow: '#f3f4f5',
  surfaceHigh: '#e7e8e9',
  surfaceHighest: '#e1e3e4',
  onSurface: '#191c1d',
  outline: '#cfc6ab',
  error: '#dc2626',
  success: '#16a34a',
} as const
