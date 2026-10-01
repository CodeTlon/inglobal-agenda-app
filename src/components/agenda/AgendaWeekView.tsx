import { useCallback, useRef, useState } from 'react'
import { View, Pressable, ActivityIndicator, ScrollView } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { Text } from '@/components/Text'
import { getEventosAgendaCached } from '@/lib/agenda-api'
import { ApiError } from '@/lib/api'
import { getWeekDays, addDays, toDateInput, estadoStripColor, getEstadoVisual, eventoOcurreEn, formatEstado } from '@/lib/agenda-view'
import type { EventoAgenda } from '@/lib/types'
import { EstadoLegend } from '@/components/EstadoLegend'
import { colors } from '@/lib/colors'
import { useNavThrottle } from '@/lib/useNavThrottle'

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

// Vista intermedia entre el mes (solo puntos) y el día (grilla horaria): lista
// por día (tarjetas anchas, legibles en celular), sin eje horario ni posicionamiento proporcional — eso lo
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
  const canNav = useNavThrottle()
  const weekDays = getWeekDays(weekStart)
  const todayStr = toDateInput(new Date())
  const weekStartStr = toDateInput(weekStart)
  const weekEndStr = toDateInput(addDays(weekStart, 6))
  // Mismo criterio que AgendaMonthView: en la semana actual se pinta solo
  // hoy; en cualquier otra, el primer día de esa semana hace de ancla.
  const isCurrentWeekView = weekStartStr <= todayStr && todayStr <= weekEndStr

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
        {/* Navega desde el día enfocado (no desde el lunes de weekStart) para
            preservar el día de semana al ir y volver — si no, "focused"
            quedaba pegado al lunes y podía pintar dos días a la vez (el
            lunes por foco, hoy por ancla) al volver a la semana actual. */}
        <Pressable
          onPress={() => canNav() && onChangeWeek(addDays(new Date(`${focusedStr}T00:00:00`), -7))}
          className="p-3"
          hitSlop={8}
        >
          <Text className="text-xl">‹</Text>
        </Pressable>
        <Text className="font-semibold text-igb-on-surface">
          {weekStart.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })} - {addDays(weekStart, 6).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
        </Text>
        <Pressable
          onPress={() => canNav() && onChangeWeek(addDays(new Date(`${focusedStr}T00:00:00`), 7))}
          className="p-3"
          hitSlop={8}
        >
          <Text className="text-xl">›</Text>
        </Pressable>
        <EstadoLegend />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.yellow} />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-igb-error text-center">{error}</Text>
        </View>
      ) : (
        // flexGrow: la semana llena todo el alto disponible (cada día reparte
        // el espacio sobrante); si un día tiene muchos servicios crece y la
        // pantalla scrollea. paddingBottom deja lugar al botón "+".
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1, paddingBottom: 88 }}>
          {weekDays.map((day, i) => {
            const dStr = toDateInput(day)
            const isToday = dStr === todayStr
            const isAnchor = isCurrentWeekView ? isToday : dStr === weekStartStr
            const isFocused = dStr === focusedStr
            const delDia = eventos
              .filter((ev) => eventoOcurreEn(ev, dStr))
              .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
            return (
              <View
                key={dStr}
                style={{ flexGrow: 1, minHeight: 84 }}
                className={`flex-row border-b border-igb-outline ${isFocused ? 'bg-igb-yellow/10' : 'bg-white'}`}
              >
                <Pressable onPress={() => onSelectDay(day)} className="w-16 items-center pt-3 border-r border-igb-outline">
                  <Text className={`text-[11px] uppercase tracking-wide ${isAnchor ? 'text-igb-on-surface font-semibold' : 'text-igb-secondary'}`}>
                    {DIAS[i]}
                  </Text>
                  <View className={`mt-1 w-9 h-9 rounded-full items-center justify-center ${isFocused ? 'bg-igb-yellow' : isAnchor ? 'bg-igb-yellow/30' : ''}`}>
                    <Text className={`text-lg font-semibold ${isFocused || isAnchor ? 'text-igb-on-yellow' : 'text-igb-on-surface'}`}>
                      {day.getDate()}
                    </Text>
                  </View>
                </Pressable>
                <View className="flex-1 py-2 px-2 justify-center">
                  {delDia.length === 0 ? (
                    <Text className="text-xs text-igb-secondary px-2">Sin servicios</Text>
                  ) : (
                    delDia.map((ev) => (
                      <Pressable
                        key={ev.id}
                        onPress={() => router.push(`/agenda/evento/${ev.id}`)}
                        className="mb-1.5 rounded-lg overflow-hidden flex-row bg-white border border-igb-outline active:opacity-70"
                      >
                        <View className={`w-1.5 ${estadoStripColor(getEstadoVisual(ev))}`} />
                        <View className="px-3 py-2 flex-1 flex-row items-center">
                          <View className="w-14">
                            <Text className="text-sm font-semibold text-igb-on-surface">
                              {ev.fecha === dStr ? ev.hora_inicio.slice(0, 5) : 'Cont.'}
                            </Text>
                            {ev.hora_fin && ev.fecha_hasta === null && (
                              <Text className="text-xs text-igb-secondary">{ev.hora_fin.slice(0, 5)}</Text>
                            )}
                          </View>
                          <View className="flex-1">
                            <Text className={`text-sm font-medium text-igb-on-surface ${getEstadoVisual(ev) === 'cancelado' ? 'line-through' : ''}`} numberOfLines={1}>
                              {ev.grua?.nombre ?? 'Sin grúa'}
                            </Text>
                            <Text className="text-xs text-igb-secondary" numberOfLines={1}>
                              {ev.empresa?.nombre ?? 'Sin empresa'} · {formatEstado(getEstadoVisual(ev))}
                            </Text>
                            {ev.operarios.length > 0 && (
                              <Text className="text-xs text-igb-secondary" numberOfLines={1}>
                                {ev.operarios.map((o) => o.nombre).join(', ')}
                              </Text>
                            )}
                          </View>
                        </View>
                      </Pressable>
                    ))
                  )}
                </View>
              </View>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}
