import { View } from 'react-native'
import { Text } from '@/components/Text'
import { ESTADOS_EVENTO } from '@/lib/types'
import { estadoStripColor, formatEstado } from '@/lib/agenda-view'

/** Leyenda de colores de estado — misma fuente (estadoStripColor/formatEstado) que usa cada card, no puede desincronizarse. */
export function EstadoLegend() {
  return (
    <View className="flex-row flex-wrap gap-x-3 gap-y-1 px-4 py-2">
      {ESTADOS_EVENTO.map((estado) => (
        <View key={estado} className="flex-row items-center gap-1.5">
          <View className={`w-2.5 h-2.5 rounded-full ${estadoStripColor(estado)}`} />
          <Text className="text-xs text-igb-secondary">{formatEstado(estado)}</Text>
        </View>
      ))}
    </View>
  )
}
