import { useEffect, useState } from 'react'
import { View, ScrollView, ActivityIndicator, Pressable } from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/Text'
import { EventoForm } from '@/components/EventoForm'
import { getEventoAgendaById, deleteEvento, updateEvento, type EventoPayload } from '@/lib/agenda-api'
import { showApiError } from '@/lib/alert'
import { confirmDialog } from '@/components/Dialog'
import { estadoColorClassesLight, formatEstado, getEstadoVisual } from '@/lib/agenda-view'
import { TRANSICIONES_VALIDAS, type EstadoEvento, type EventoAgenda } from '@/lib/types'
import { colors } from '@/lib/colors'

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
    confirmDialog('Eliminar evento', '¿Seguro que querés eliminar este evento?', [
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
    confirmDialog('Cambiar estado', `¿Pasar a "${formatEstado(nuevo)}"?`, [
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
              // Cambiar estado solo se ofrece para reserva/programado/en_curso
              // (TRANSICIONES_VALIDAS), y catalogDelete bloquea borrar una
              // grúa/empresa con eventos en esos estados — nunca pueden ser
              // null acá todavía.
              grua_id: evento.grua_id!,
              empresa_id: evento.empresa_id!,
              ubicacion: evento.ubicacion,
              notas: evento.notas,
              estado: nuevo,
              operario_ids: evento.operarios.map((o) => o.id),
            }
            await updateEvento(evento.id, payload)
            setEvento({ ...evento, estado: nuevo })
          } catch (e) {
            showApiError(e, 'Revisá tu conexión e intentá de nuevo.', 'No se pudo cambiar el estado')
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
        <ActivityIndicator color={colors.yellow} />
      </View>
    )
  }

  if (error || !evento) {
    return (
      <View className="flex-1 items-center justify-center bg-igb-surface p-8">
        <Text className="text-igb-error text-center">{error ?? 'Evento no encontrado.'}</Text>
      </View>
    )
  }

  if (editando) {
    return (
      <>
        <Stack.Screen options={{ title: 'Editar evento' }} />
        <EventoForm
          initial={evento}
          onDone={() => router.back()}
          footer={
            <Pressable onPress={handleDelete} className="border border-igb-error/30 rounded-lg py-2.5 items-center mt-3">
              <Text className="text-igb-error font-medium">Eliminar evento</Text>
            </Pressable>
          }
        />
      </>
    )
  }

  // `as EstadoEvento`: getEstadoVisual siempre devuelve uno de los 5 estados
  // conocidos, solo que su firma es `string` porque agenda-view.ts es una
  // copia 1:1 de inglobal-site/lib/agenda-view.ts (ver comentario del
  // archivo) — no le cambiamos el tipo ahí para no divergir de esa fuente.
  const estadoVisual = getEstadoVisual(evento) as EstadoEvento

  return (
    <>
      <Stack.Screen options={{ title: 'Evento' }} />
      <ScrollView className="flex-1 bg-igb-surface" contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View className="bg-white rounded-2xl border border-igb-outline p-4 gap-3">
          <View className={`self-start px-2.5 py-1 rounded ${estadoColorClassesLight(estadoVisual)}`}>
            <Text className="text-xs font-bold">{formatEstado(estadoVisual)}</Text>
          </View>
          <Text className="font-headline text-xl text-igb-on-surface">{evento.grua?.nombre ?? 'Grúa eliminada'}</Text>

          <DetailRow icon="calendar-outline" text={formatFecha(evento)} />
          <DetailRow
            icon="time-outline"
            text={`${evento.hora_inicio.slice(0, 5)}${evento.hora_fin ? ` – ${evento.hora_fin.slice(0, 5)}` : ''}`}
          />
          <DetailRow icon="business-outline" text={evento.empresa?.nombre ?? 'Empresa eliminada'} />
          {evento.ubicacion ? <DetailRow icon="location-outline" text={evento.ubicacion} /> : null}
          <DetailRow
            icon="people-outline"
            text={evento.operarios.length > 0 ? evento.operarios.map((o) => o.nombre).join(', ') : 'Sin operario asignado'}
          />
          {evento.notas ? <Text className="text-igb-secondary pt-2 border-t border-igb-outline">{evento.notas}</Text> : null}
        </View>

        {/* Transiciones ofrecidas según el estado VISUAL (el badge de arriba), no
            el crudo de la DB — si no, un `programado` cuya ventana ya pasó
            mostraba badge "Finalizado" pero seguía ofreciendo "En curso". */}
        {TRANSICIONES_VALIDAS[estadoVisual].length > 0 && (
          <View className="bg-white rounded-2xl border border-igb-outline p-4 gap-2">
            <Text className="text-igb-on-surface font-medium mb-1">Cambiar estado</Text>
            <View className="flex-row flex-wrap gap-2">
              {TRANSICIONES_VALIDAS[estadoVisual].map((siguiente) => (
                // ponytail: disabled: no aplica en RN Web — opacity a mano.
                <Pressable
                  key={siguiente}
                  disabled={cambiandoEstado}
                  onPress={() => handleCambiarEstado(siguiente)}
                  className={`px-3 py-2 rounded-lg border ${estadoColorClassesLight(siguiente)} ${cambiandoEstado ? 'opacity-60' : ''}`}
                >
                  <Text className="text-xs font-bold">{formatEstado(siguiente)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* En en_curso/cancelado/finalizado no se puede editar — EventoForm
            bloquea los campos igual, pero mejor ni ofrecer el botón. */}
        {!['en_curso', 'cancelado', 'finalizado'].includes(estadoVisual) && (
          <Pressable onPress={() => setEditando(true)} className="bg-igb-yellow rounded-lg py-3.5 items-center">
            <Text className="text-igb-on-yellow font-bold">Editar</Text>
          </Pressable>
        )}

        <Pressable onPress={handleDelete} className="border border-igb-error/30 rounded-lg py-2.5 items-center">
          <Text className="text-igb-error font-medium">Eliminar evento</Text>
        </Pressable>
      </ScrollView>
    </>
  )
}

function DetailRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <Ionicons name={icon} size={18} color={colors.secondary} />
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
