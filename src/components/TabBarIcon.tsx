import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/Text'
import type { ComponentProps } from 'react'

// Ítem de bottom tab: inactivo es ícono+label apilado gris; activo pasa a un
// chip amarillo compacto, como en las referencias de diseño. tabBarShowLabel
// queda en false en el _layout — el label vive acá adentro.
export function TabBarIcon({
  focused,
  name,
  label,
}: {
  focused: boolean
  name: ComponentProps<typeof Ionicons>['name']
  label: string
}) {
  if (focused) {
    return (
      <View className="bg-igb-yellow rounded-lg px-5 py-1.5 items-center gap-0.5">
        <Ionicons name={name} size={20} color="#221b00" />
        <Text className="text-igb-on-yellow text-[10px] font-semibold">{label}</Text>
      </View>
    )
  }
  return (
    <View className="items-center gap-1 px-4 py-1">
      <Ionicons name={name} size={20} color="#575d78" />
      <Text className="text-igb-secondary text-[10px]">{label}</Text>
    </View>
  )
}
