import { useState } from 'react'
import { View, Pressable, Modal } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/Text'
import { ESTADOS_EVENTO } from '@/lib/types'
import { estadoStripColor, formatEstado } from '@/lib/agenda-view'
import { colors } from '@/lib/colors'

/** Ícono de info que despliega, en un modal, qué significa cada color de estado. */
export function EstadoLegend() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Pressable onPress={() => setOpen(true)} hitSlop={8}>
        <Ionicons name="information-circle-outline" size={18} color={colors.secondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 bg-black/40 items-center justify-center px-10" onPress={() => setOpen(false)}>
          <Pressable className="bg-white rounded-2xl p-5 w-full max-w-xs gap-3" onPress={(e) => e.stopPropagation()}>
            <Text className="font-semibold text-igb-on-surface text-center mb-1">Estados del calendario</Text>
            {ESTADOS_EVENTO.map((estado) => (
              <View key={estado} className="flex-row items-center gap-2">
                <View className={`w-3 h-3 rounded-full ${estadoStripColor(estado)}`} />
                <Text className="text-sm text-igb-secondary">{formatEstado(estado)}</Text>
              </View>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}
