import { useCallback, useRef, useState } from 'react'
import { View, Pressable, ActivityIndicator, ScrollView } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { Text } from '@/components/Text'
import { getEventosAgendaCached } from '@/lib/agenda-api'
import { ApiError } from '@/lib/api'
import { getWeekDays, addDays, toDateInput, estadoStripColor, getEstadoVisual } from '@/lib/agenda-view'
import type { EventoAgenda } from '@/lib/types'
import { EstadoLegend } from '@/components/EstadoLegend'

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function eventoOcurreEn(ev: EventoAgenda, fecha: string): boolean {
  return ev.fecha <= fecha && fecha <= (ev.fecha_hasta ?? ev.fecha)
}

// Vista intermedia entre el mes (solo puntos) y el día (grilla horaria): lista
// compacta por día, sin eje horario ni posicionamiento proporcional — eso lo
// resuelve la vista diaria, que ya existía y no cambia.
export function AgendaWeekView({
  weekStart,
  focusedStr,
  onSelectDay,
  onChangeWeek,
  onBack,
}: {
  weekStart: Date
  focusedStr: string
  onSelectDay: (d: Date) => void
  onChangeWeek: (d: Date) => void
  onBack: () => void
}) {
  const router = useRouter()
  const [eventos, setEventos] = useState<EventoAgenda[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const weekDays = getWeekDays(weekStart)
  const todayStr = toDateInput(new Date())
  const weekStartStr = toDateInput(weekStart)
  const weekEndStr = toDateInput(addDays(weekStart, 6))

  // useFocusEffect (no un useEffect atado solo a [weekStartStr, weekEndStr])
  // para que también recargue al volver de crear/editar/borrar un evento.
  //
  // hasLoadedOnceRef: mismo guard anti-flicker que ya usa Día — sin esto,
  // cada refoco hacía desaparecer la lista detrás de un spinner de pantalla
  // completa aunque los datos ya estuvieran cacheados.
  const hasLoadedOnceRef = useRef(false)
  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      if (!hasLoadedOnceRef.current) setLoading(true)
      setError(null)
      getEventosAgendaCached(weekStartStr, weekEndStr)
        .then((data) => {
          if (!cancelled) setEventos(data)
        })
        .catch((e) => {
          if (!cancelled) setError(e instanceof ApiError ? e.message : 'No se pudieron cargar los eventos. Revisá tu conexión.')
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false)
            hasLoadedOnceRef.current = true
          }
        })
      return () => {
        cancelled = true
      }
    }, [weekStartStr, weekEndStr]),
  )

  return (
    <View className="flex-1 bg-igb-surface">
      <View className="bg-white border-b border-igb-outline px-2 pt-3 pb-2 flex-row justify-between items-center">
        <Pressable onPress={onBack} className="p-2">
          <Text className="text-sm text-igb-secondary">◂ Mes</Text>
        </Pressable>
        <Pressable onPress={() => onChangeWeek(addDays(weekStart, -7))} className="p-2">
          <Text className="text-lg">‹</Text>
        </Pressable>
        <Text className="font-semibold text-igb-on-surface">
          {weekStart.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })} - {addDays(weekStart, 6).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
        </Text>
        <Pressable onPress={() => onChangeWeek(addDays(weekStart, 7))} className="p-2">
          <Text className="text-lg">›</Text>
        </Pressable>
        <EstadoLegend />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#f5d100" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-igb-error text-center">{error}</Text>
        </View>
      ) : (
        <View className="flex-1 flex-row">
          {weekDays.map((day, i) => {
            const dStr = toDateInput(day)
            const isToday = dStr === todayStr
            const isFocused = dStr === focusedStr
            const delDia = eventos
              .filter((ev) => eventoOcurreEn(ev, dStr))
              .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
            return (
              <View key={dStr} className="flex-1 border-r border-igb-outline">
                <Pressable
                  onPress={() => onSelectDay(day)}
                  className={`items-center py-2 ${isFocused ? 'bg-igb-yellow' : isToday ? 'bg-igb-yellow/10' : ''}`}
                >
                  <Text className={`text-[10px] ${isFocused ? 'text-igb-on-yellow' : 'text-igb-secondary'}`}>{DIAS[i]}</Text>
                  <Text className={`text-sm font-semibold ${isFocused ? 'text-igb-on-yellow' : 'text-igb-on-surface'}`}>
                    {day.getDate()}
                  </Text>
                </Pressable>
                <ScrollView className="flex-1 px-0.5" contentContainerStyle={{ paddingBottom: 12 }}>
                  {delDia.map((ev) => (
                    <Pressable
                      key={ev.id}
                      onPress={() => router.push(`/agenda/evento/${ev.id}`)}
                      className="mb-1 rounded overflow-hidden flex-row bg-white border border-igb-outline"
                    >
                      <View className={`w-1 ${estadoStripColor(getEstadoVisual(ev))}`} />
                      <View className="px-1 py-1 flex-1">
                        <Text className="text-[9px] text-igb-secondary" numberOfLines={1}>
                          {ev.hora_inicio.slice(0, 5)}
                        </Text>
                        <Text className="text-[9px] font-medium text-igb-on-surface" numberOfLines={1}>
                          {ev.grua?.nombre ?? '—'}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}
