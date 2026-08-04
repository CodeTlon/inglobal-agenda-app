import { Text as RNText, type TextProps } from 'react-native'

// RN no sintetiza negrita sobre una fuente custom: font-weight (font-bold/font-semibold)
// no alcanza, cada peso es un archivo de fuente distinto. Este wrapper mira el className
// y elige el archivo Inter/Manrope correcto — así el resto del código sigue usando
// font-bold/font-semibold tal cual, sin tener que tocar cada pantalla.
const WEIGHT_FONT: [RegExp, string][] = [
  [/\bfont-headline\b/, 'Manrope_700Bold'],
  [/\bfont-bold\b/, 'Inter_700Bold'],
  [/\bfont-semibold\b/, 'Inter_600SemiBold'],
  [/\bfont-medium\b/, 'Inter_500Medium'],
]

export function Text({ className, style, ...props }: TextProps & { className?: string }) {
  const match = className ? WEIGHT_FONT.find(([re]) => re.test(className)) : undefined
  const fontFamily = match ? match[1] : 'Inter_400Regular'
  return <RNText className={className} style={[{ fontFamily }, style]} {...props} />
}
