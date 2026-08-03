import { View, Text, Pressable } from 'react-native'
import { useRouter } from 'expo-router'

const ITEMS = [
  { href: '/catalogos/gruas', label: 'Grúas', emoji: '🚚' },
  { href: '/catalogos/empresas', label: 'Empresas', emoji: '🏢' },
  { href: '/catalogos/operarios', label: 'Operarios', emoji: '👷' },
] as const

export default function CatalogosScreen() {
  const router = useRouter()
  return (
    <View className="flex-1 bg-igb-surface p-4">
      {ITEMS.map((item) => (
        <Pressable
          key={item.href}
          onPress={() => router.push(item.href)}
          className="bg-white border border-igb-outline rounded-xl p-4 mb-3 flex-row items-center"
        >
          <Text className="text-2xl mr-3">{item.emoji}</Text>
          <Text className="text-lg font-semibold text-igb-on-surface">{item.label}</Text>
        </Pressable>
      ))}
    </View>
  )
}
