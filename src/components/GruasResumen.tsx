import { View } from 'react-native'
import { Text } from '@/components/Text'
import { partesResumenGruas } from '@/lib/gruas'
import type { EventoAgenda } from '@/lib/types'

// Línea de grúas para tarjetas: los nombres se recortan con "…" si no entran,
// pero el "+N" queda fuera del recorte y siempre se ve, en cualquier ancho.
export function GruasResumen({
  evento,
  max = 2,
  className = 'text-xs text-igb-secondary',
}: {
  evento: Pick<EventoAgenda, 'gruas' | 'grua' | 'grua_id'>
  max?: number
  className?: string
}) {
  const { texto, resto } = partesResumenGruas(evento, max)
  return (
    <View className="flex-row items-center">
      <Text className={`shrink ${className}`} numberOfLines={1}>
        {texto}
      </Text>
      {resto > 0 && <Text className={`ml-1 font-semibold ${className}`}>+{resto}</Text>}
    </View>
  )
}
