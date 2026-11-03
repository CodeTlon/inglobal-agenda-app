import { View, Pressable } from 'react-native'
import { Text } from '@/components/Text'

/** Error de carga con un botón para volver a pedir: sin él, la vista quedaba trabada hasta cambiar de pantalla. */
export function ErrorReintentar({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) {
  return (
    <View className="flex-1 items-center justify-center p-6">
      <Text className="text-igb-error text-center">{mensaje}</Text>
      <Pressable onPress={onReintentar} className="mt-4 bg-igb-yellow rounded-lg px-6 py-3">
        <Text className="text-igb-on-yellow font-bold">Reintentar</Text>
      </Pressable>
    </View>
  )
}
