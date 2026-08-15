import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/Text'

// ponytail: mismo bloque se repetía calcado en 4 formularios (texto rojo suelto,
// sin fondo/ícono) — se junta acá para no reescribirlo 4 veces.
export function ErrorBanner({ message }: { message: string }) {
  return (
    <View className="flex-row items-center gap-2 bg-igb-error/10 border border-igb-error/30 rounded-lg px-3 py-2 mb-3">
      <Ionicons name="alert-circle" size={18} color="#dc2626" />
      <Text className="text-igb-error flex-1">{message}</Text>
    </View>
  )
}
