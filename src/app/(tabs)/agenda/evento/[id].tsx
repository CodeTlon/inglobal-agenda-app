import { useEffect, useState } from 'react'
import { View, ScrollView, ActivityIndicator, Pressable, Alert } from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/Text'
import { EventoForm } from '@/components/EventoForm'
import { getEventoAgendaById, deleteEvento } from '@/lib/agenda-api'
import { ApiError } from '@/lib/api'
import { estadoColorClassesLight, formatEstado, getEstadoVisual } from '@/lib/agenda-view'
import type { EventoAgenda } from '@/lib/types'

export default function EventoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [evento, setEvento] = useState<EventoAgenda | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Por defecto se abre en modo lectura — antes tocar un evento te tiraba directo al
  // formulario de edición, sin forma de solo ver los datos.
  const [editando, setEditando] = useState(false)

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

  if (editando) {
    return (
      <>
        <Stack.Screen options={{ title: 'Editar evento' }} />
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
      </>
    )
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Evento' }} />
      <ScrollView className="flex-1 bg-igb-surface" contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View className="bg-white rounded-2xl border border-igb-outline p-4 gap-3">
          <View className={`self-start px-2.5 py-1 rounded ${estadoColorClassesLight(getEstadoVisual(evento))}`}>
            <Text className="text-xs font-bold">{formatEstado(getEstadoVisual(evento))}</Text>
          </View>
          <Text className="font-headline text-xl text-igb-on-surface">{evento.grua?.nombre ?? 'Grúa'}</Text>

          <DetailRow icon="calendar-outline" text={formatFecha(evento)} />
          <DetailRow
            icon="time-outline"
            text={`${evento.hora_inicio.slice(0, 5)}${evento.hora_fin ? ` – ${evento.hora_fin.slice(0, 5)}` : ''}`}
          />
          <DetailRow icon="business-outline" text={evento.empresa?.nombre ?? 'Empresa'} />
          {evento.ubicacion ? <DetailRow icon="location-outline" text={evento.ubicacion} /> : null}
          {evento.operarios.length > 0 ? (
            <DetailRow icon="people-outline" text={evento.operarios.map((o) => o.nombre).join(', ')} />
          ) : null}
          {evento.notas ? <Text className="text-igb-secondary pt-2 border-t border-igb-outline">{evento.notas}</Text> : null}
        </View>

        <Pressable onPress={() => setEditando(true)} className="bg-igb-yellow rounded-xl py-3.5 items-center">
          <Text className="text-igb-on-yellow font-bold">Editar</Text>
        </Pressable>

        {puedeBorrar && (
          <Pressable onPress={handleDelete} className="items-center py-3">
            <Text className="text-red-600 font-medium">Eliminar evento</Text>
          </Pressable>
        )}
      </ScrollView>
    </>
  )
}

function DetailRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <Ionicons name={icon} size={18} color="#575d78" />
      <Text className="text-igb-secondary flex-1">{text}</Text>
    </View>
  )
}

function formatFecha(evento: EventoAgenda): string {
  const fecha = new Date(`${evento.fecha}T00:00:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  if (!evento.fecha_hasta) return fecha
  const hasta = new Date(`${evento.fecha_hasta}T00:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
  return `${fecha} hasta el ${hasta}`
}
