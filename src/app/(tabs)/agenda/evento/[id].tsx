import { useEffect, useState } from 'react'
import { View, ScrollView, ActivityIndicator, Pressable, Alert } from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/Text'
import { EventoForm } from '@/components/EventoForm'
import { getEventoAgendaById, deleteEvento, updateEvento, type EventoPayload } from '@/lib/agenda-api'
import { showApiError } from '@/lib/alert'
import { estadoColorClassesLight, formatEstado, getEstadoVisual } from '@/lib/agenda-view'
import { TRANSICIONES_VALIDAS, type EstadoEvento, type EventoAgenda } from '@/lib/types'

export default function EventoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [evento, setEvento] = useState<EventoAgenda | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Por defecto se abre en modo lectura — antes tocar un evento te tiraba directo al
  // formulario de edición, sin forma de solo ver los datos.
  const [editando, setEditando] = useState(false)
  const [cambiandoEstado, setCambiandoEstado] = useState(false)

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
            showApiError(e, 'No se pudo eliminar el evento.', 'No se pudo eliminar')
          }
        },
      },
    ])
  }

  // Cambiar estado es una acción rápida, separada de "editar evento" (que es para
  // los datos específicos del trabajo — fecha/grúa/empresa/operarios/notas). Manda
  // el evento tal cual está más el nuevo estado: el PATCH exige el objeto completo.
  function handleCambiarEstado(nuevo: EstadoEvento) {
    if (!evento) return
    Alert.alert('Cambiar estado', `¿Pasar a "${formatEstado(nuevo)}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Confirmar',
        onPress: async () => {
          setCambiandoEstado(true)
          try {
            const payload: EventoPayload = {
              fecha: evento.fecha,
              fecha_hasta: evento.fecha_hasta,
              hora_inicio: evento.hora_inicio,
              hora_fin: evento.hora_fin,
              grua_id: evento.grua_id,
              empresa_id: evento.empresa_id,
              ubicacion: evento.ubicacion,
              notas: evento.notas,
              estado: nuevo,
              operario_ids: evento.operarios.map((o) => o.id),
            }
            await updateEvento(evento.id, payload)
            setEvento({ ...evento, estado: nuevo })
          } catch (e) {
            showApiError(e, 'No se pudo cambiar el estado.', 'No se pudo cambiar el estado')
          } finally {
            setCambiandoEstado(false)
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

        {TRANSICIONES_VALIDAS[evento.estado].length > 0 && (
          <View className="bg-white rounded-2xl border border-igb-outline p-4 gap-2">
            <Text className="text-igb-on-surface font-medium mb-1">Cambiar estado</Text>
            <View className="flex-row flex-wrap gap-2">
              {TRANSICIONES_VALIDAS[evento.estado].map((siguiente) => (
                <Pressable
                  key={siguiente}
                  disabled={cambiandoEstado}
                  onPress={() => handleCambiarEstado(siguiente)}
                  className={`px-3 py-2 rounded-lg border ${estadoColorClassesLight(siguiente)} disabled:opacity-60`}
                >
                  <Text className="text-xs font-bold">{formatEstado(siguiente)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

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
