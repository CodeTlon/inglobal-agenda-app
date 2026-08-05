import { Image, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router, usePathname } from 'expo-router'
import { Text } from '@/components/Text'
import { useSession } from '@/lib/session'

const LINKS = [
  { href: '/agenda', label: 'Agenda' },
  { href: '/catalogos', label: 'Catálogos' },
  { href: '/perfil', label: 'Perfil' },
] as const

// Header de arriba compartido por las 3 secciones (index de cada tab): links de
// navegación a la izquierda, logo a la derecha. Las sub-pantallas (evento/nuevo,
// pair-tv, etc.) siguen usando el header por defecto del Stack de su sección.
export function NavHeader() {
  const insets = useSafeAreaInsets()
  const pathname = usePathname()
  const { session } = useSession()
  const isTrabajador = session?.user.app_metadata?.role === 'trabajador'

  return (
    <View
      className="flex-row items-center justify-between bg-igb-yellow"
      style={{ paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16 }}
    >
      <View className="flex-row items-center gap-4">
        {LINKS.filter((l) => l.href !== '/catalogos' || !isTrabajador).map((l) => (
          <Pressable key={l.href} onPress={() => router.push(l.href)}>
            <Text
              className={`text-igb-navy text-lg ${pathname.startsWith(l.href) ? 'font-bold' : 'font-semibold'}`}
            >
              {l.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Image source={require('../../assets/images/logo-inglobal.png')} resizeMode="contain" style={{ width: 120, height: 30 }} />
    </View>
  )
}
