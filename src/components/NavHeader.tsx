import { Image, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from '@/components/Text'

// Header de arriba de cada sección: eyebrow chico + título grande a la
// izquierda (blanco sobre navy), logo y acciones opcionales a la derecha.
// `right` va antes que el logo — para el botón "+ Nuevo" u otras acciones
// puntuales de cada pantalla, sin sacar el logo de marca.
export function NavHeader({ title, eyebrow, right }: { title: string; eyebrow?: string; right?: React.ReactNode }) {
  const insets = useSafeAreaInsets()

  return (
    <View
      className="flex-row items-center justify-between bg-igb-navy"
      style={{ paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16 }}
    >
      <View>
        {eyebrow ? <Text className="text-white/50 text-xs uppercase tracking-widest mb-0.5">{eyebrow}</Text> : null}
        <Text className="text-white text-xl font-bold">{title}</Text>
      </View>
      <View className="flex-row items-center gap-2.5">
        {right}
        <Image source={require('../../assets/images/logo-inglobal.png')} resizeMode="contain" style={{ width: 100, height: 26 }} />
      </View>
    </View>
  )
}
