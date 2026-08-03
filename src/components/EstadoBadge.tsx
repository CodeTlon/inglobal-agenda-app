import { View, Text } from 'react-native'
import { estadoColorClassesLight, formatEstado } from '@/lib/agenda-view'

export function EstadoBadge({ estado }: { estado: string }) {
  return (
    <View className={`px-2.5 py-1 rounded-full border self-start ${estadoColorClassesLight(estado)}`}>
      <Text className="text-xs font-semibold">{formatEstado(estado)}</Text>
    </View>
  )
}
