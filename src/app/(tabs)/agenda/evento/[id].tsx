import { useEffect, useState } from 'react'
import { View, ActivityIndicator, Pressable, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Text } from '@/components/Text'
import { EventoForm } from '@/components/EventoForm'
import { getEventoAgendaById, deleteEvento } from '@/lib/agenda-api'
import { ApiError } from '@/lib/api'
import type { EventoAgenda } from '@/lib/types'

export default function EditarEventoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [evento, setEvento] = useState<EventoAgenda | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getEventoAgendaById(id)
      .then(setEvento)
      .catch(() => setError('No se pudo cargar el evento.'))
      .finally(() => setLoading(false))
  }, [id])

  function handleDelete() {
    Alert.alert('Eliminar evento', '¿Seguro que querés eliminar este evento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEvento(id)
            router.back()
          } catch (e) {
            Alert.alert('Error', e instanceof ApiError ? e.message : 'No se pudo eliminar el evento.')
          }
        },
      },
    ])
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-igb-surface">
        <ActivityIndicator color="#f5d100" />
      </View>
    )
  }

  if (error || !evento) {
    return (
      <View className="flex-1 items-center justify-center bg-igb-surface p-8">
        <Text className="text-red-600 text-center">{error ?? 'Evento no encontrado.'}</Text>
      </View>
    )
  }

  const puedeBorrar = evento.estado === 'reserva' || evento.estado === 'programado'

  return (
    <EventoForm
      initial={evento}
      onDone={() => router.back()}
      footer={
        puedeBorrar ? (
          <Pressable onPress={handleDelete} className="items-center py-3 mt-3">
            <Text className="text-red-600 font-medium">Eliminar evento</Text>
          </Pressable>
        ) : undefined
      }
    />
  )
}
