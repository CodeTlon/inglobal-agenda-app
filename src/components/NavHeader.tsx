import { Image, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from '@/components/Text'

// Header de arriba de cada sección: título de la pantalla actual a la
// izquierda (azul, grande), logo a la derecha.
export function NavHeader({ title }: { title: string }) {
  const insets = useSafeAreaInsets()

  return (
    <View
      className="flex-row items-center justify-between bg-igb-yellow"
      style={{ paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16 }}
    >
      <Text className="text-igb-navy text-xl font-bold">{title}</Text>
      <Image source={require('../../assets/images/logo-inglobal.png')} resizeMode="contain" style={{ width: 120, height: 30 }} />
    </View>
  )
}
