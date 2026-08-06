import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native'
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Text } from '@/components/Text'
import { getEventosAgenda } from '@/lib/agenda-api'
import { ApiError } from '@/lib/api'
import { getWeekStart, getWeekDays, addDays, toDateInput, estadoStripColor, layoutDayEvents, formatEstado } from '@/lib/agenda-view'
import type { EventoAgenda } from '@/lib/types'
import { EstadoLegend } from '@/components/EstadoLegend'

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const PX_PER_HOUR = 60
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAY_HEIGHT = 24 * PX_PER_HOUR
const DEFAULT_DURATION_MIN = 60
const MIN_CARD_HEIGHT = 44
// Ventana de días renderizada como una única lista continua: bajar de un día
// a otro es scroll normal, no un salto de pantalla. La ventana arranca con
// este tamaño y crece sola (ver `extend`) al acercarse al borde del scroll,
// para atrás o para adelante, sin techo.
const INITIAL_BEFORE = 7
const INITIAL_AFTER = 23
const EXTEND_CHUNK = 14
const EDGE_TRIGGER = DAY_HEIGHT * 3

function toMinutes(hhmmss: string): number {
  const [h, m] = hhmmss.split(':').map(Number)
  return h * 60 + m
}
function nowMinutes(): number {
  const n = new Date()
  return n.getHours() * 60 + n.getMinutes()
}
function eventoOcurreEn(ev: EventoAgenda, fecha: string): boolean {
  return ev.fecha <= fecha && fecha <= (ev.fecha_hasta ?? ev.fecha)
}

type Positioned = { ev: EventoAgenda; top: number; height: number; lane: number; lanes: number }

export default function AgendaScreen() {
  const router = useRouter()
  const [days, setDays] = useState(() =>
    Array.from({ length: INITIAL_BEFORE + INITIAL_AFTER + 1 }, (_, i) => addDays(new Date(), i - INITIAL_BEFORE)),
  )
  const [focused, setFocused] = useState(() => new Date()) // día resaltado en el header, sigue el scroll
  const [eventos, setEventos] = useState<EventoAgenda[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const timelineRef = useRef<ScrollView>(null)
  const scrollYRef = useRef(0)
  const extendingRef = useRef<'past' | 'future' | null>(null)
  const daysRef = useRef(days)
  daysRef.current = days
  const pendingScrollRef = useRef<{ dateStr: string; animated: boolean } | null>({
    dateStr: toDateInput(new Date()),
    animated: false,
  })

  const windowStart = days[0]
  const windowEnd = days[days.length - 1]
  const focusedStr = toDateInput(focused)
  const todayStr = toDateInput(new Date())
  const todayIdx = days.findIndex((d) => toDateInput(d) === todayStr)
  const weekStart = getWeekStart(focused)
  const weekDays = getWeekDays(weekStart)

  async function fetchEventos(desde: string, hasta: string): Promise<EventoAgenda[]> {
    try {
      return await getEventosAgenda(desde, hasta)
    } catch (e) {
      setError(e instanceof ApiError ? `Error ${e.status}: ${e.message}` : `Error de red: ${String(e)}`)
      return []
    }
  }

  // Refetch completo de toda la ventana visible al volver a la pantalla. No
  // depende de `days` (usa el ref) para no reejecutarse cada vez que
  // `extend` hace crecer la ventana mientras scrolleás — solo en focus real.
  const load = useCallback(() => {
    setError(null)
    const d = daysRef.current
    fetchEventos(toDateInput(d[0]), toDateInput(d[d.length - 1])).then((data) => {
      setEventos(data)
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      load()
    }, [load]),
  )

  // Consume el scroll pendiente (posición inicial o navegación explícita a un
  // día fuera de todo lo ya renderizado) recién cuando terminó de cargar.
  useEffect(() => {
    if (loading || !pendingScrollRef.current) return
    const { dateStr, animated } = pendingScrollRef.current
    pendingScrollRef.current = null
    scrollToDate(dateStr, animated)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  function scrollToDate(dateStr: string, animated: boolean) {
    const idx = days.findIndex((d) => toDateInput(d) === dateStr)
    if (idx === -1) return
    const eventosDelDia = eventos.filter((ev) => eventoOcurreEn(ev, dateStr))
    const anchorMin = eventosDelDia.length > 0
      ? Math.min(...eventosDelDia.map((ev) => toMinutes(ev.hora_inicio)))
      : dateStr === todayStr ? nowMinutes() : 7 * 60
    const y = idx * DAY_HEIGHT + Math.max(0, (anchorMin / 60 - 1) * PX_PER_HOUR)
    timelineRef.current?.scrollTo({ y, animated })
  }

  // Navegación explícita (flechas de semana, tap en un día). Si el destino ya
  // está entre los días renderizados, solo scrollea — sin refetch ni
  // parpadeo. Si está más lejos de lo que se llegó a renderizar scrolleando,
  // arma una ventana nueva centrada ahí (esto sí es un salto, pero es a
  // pedido explícito, no arrastrando el dedo).
  function goTo(date: Date, animated = true) {
    const dateStr = toDateInput(date)
    setFocused(date)
    if (date >= windowStart && date <= windowEnd) {
      scrollToDate(dateStr, animated)
      return
    }
    const newDays = Array.from({ length: INITIAL_BEFORE + INITIAL_AFTER + 1 }, (_, i) => addDays(date, i - INITIAL_BEFORE))
    setDays(newDays)
    pendingScrollRef.current = { dateStr, animated }
    setLoading(true)
    fetchEventos(toDateInput(newDays[0]), toDateInput(newDays[newDays.length - 1])).then((data) => {
      setEventos(data)
      setLoading(false)
    })
  }

  // Scroll infinito: al acercarse a cualquiera de los dos bordes de lo ya
  // renderizado, suma más días de ese lado (sin tocar el otro extremo). Para
  // atrás hay que compensar el scroll — el contenido de arriba creció, así
  // que sin corregir la posición la pantalla "saltaría" para abajo.
  async function extend(direction: 'past' | 'future') {
    if (extendingRef.current) return
    extendingRef.current = direction
    const chunk = Array.from({ length: EXTEND_CHUNK }, (_, i) =>
      direction === 'future' ? addDays(windowEnd, i + 1) : addDays(windowStart, i - EXTEND_CHUNK),
    )
    const data = await fetchEventos(toDateInput(chunk[0]), toDateInput(chunk[chunk.length - 1]))
    setEventos((prev) => [...prev, ...data])
    setDays((prev) => (direction === 'future' ? [...prev, ...chunk] : [...chunk, ...prev]))
    if (direction === 'past') {
      requestAnimationFrame(() => {
        timelineRef.current?.scrollTo({ y: scrollYRef.current + EXTEND_CHUNK * DAY_HEIGHT, animated: false })
      })
    }
    extendingRef.current = null
  }

  // Qué día está centrado en el scroll actual, para resaltar el header — no
  // mueve el scroll, la lista ya es continua. También dispara `extend`
  // cuando el scroll se acerca a un borde de lo renderizado.
  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent
    scrollYRef.current = contentOffset.y
    const idx = Math.min(days.length - 1, Math.max(0, Math.round(contentOffset.y / DAY_HEIGHT)))
    const d = days[idx]
    setFocused((prev) => (toDateInput(prev) === toDateInput(d) ? prev : d))

    if (contentOffset.y < EDGE_TRIGGER) extend('past')
    else if (contentOffset.y + layoutMeasurement.height > contentSize.height - EDGE_TRIGGER) extend('future')
  }

  // Carriles side-by-side para eventos que se solapan en horario, en
  // coordenadas globales (no por día) — así un trabajo que cruza medianoche
  // (22:00-04:00) es una sola card continua entre los dos bloques de día, sin
  // costura. layoutDayEvents compara strings, y "fecha+hora" ISO ordena
  // cronológicamente igual que solo "hora", así que se reutiliza tal cual.
  const positioned = useMemo<Positioned[]>(() => {
    const dayIndex = new Map(days.map((d, i) => [toDateInput(d), i]))
    const windowStartStr = toDateInput(windowStart)
    const windowEndStr = toDateInput(windowEnd)
    const relevant = eventos.filter((ev) => (ev.fecha_hasta ?? ev.fecha) >= windowStartStr && ev.fecha <= windowEndStr)
    const withKeys = relevant.map((ev) => ({
      ev,
      hora_inicio: `${ev.fecha}T${ev.hora_inicio}`,
      hora_fin: `${ev.fecha_hasta ?? ev.fecha}T${ev.hora_fin ?? ev.hora_inicio}`,
    }))
    const layout = layoutDayEvents(withKeys)
    return withKeys.map((item) => {
      const slot = layout.get(item)!
      const startMin = toMinutes(item.ev.hora_inicio)
      const endMin = item.ev.hora_fin ? toMinutes(item.ev.hora_fin) : startMin + DEFAULT_DURATION_MIN
      const startDayIdx = dayIndex.get(item.ev.fecha) ?? 0
      // Si hora_fin <= hora_inicio y no se cargó fecha_hasta, asumimos que
      // cruza a la madrugada del día siguiente (caso típico 22:00-04:00).
      const endsNextDay = endMin <= startMin && !item.ev.fecha_hasta
      const endDayIdx = endsNextDay ? startDayIdx + 1 : dayIndex.get(item.ev.fecha_hasta ?? item.ev.fecha) ?? startDayIdx
      const top = Math.max(0, startDayIdx * DAY_HEIGHT + (startMin / 60) * PX_PER_HOUR)
      const bottom = Math.min(days.length * DAY_HEIGHT, endDayIdx * DAY_HEIGHT + (endMin / 60) * PX_PER_HOUR)
      return { ev: item.ev, top, height: Math.max(bottom - top, MIN_CARD_HEIGHT), lane: slot.lane, lanes: slot.lanes }
    })
  }, [eventos, days])

  return (
    <View className="flex-1 bg-igb-surface">
      <View className="bg-white border-b border-igb-outline pb-2">
        <View className="flex-row justify-between items-center px-4 pt-3 pb-1">
          <Pressable onPress={() => goTo(addDays(focused, -7))} className="p-2">
            <Text className="text-lg">‹</Text>
          </Pressable>
          <Text className="font-semibold text-igb-on-surface">
            {weekStart.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })} - {addDays(weekStart, 6).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
          </Text>
          <Pressable onPress={() => goTo(addDays(focused, 7))} className="p-2">
            <Text className="text-lg">›</Text>
          </Pressable>
          <EstadoLegend />
        </View>
        <View className="flex-row px-2">
          {weekDays.map((d, i) => {
            const dStr = toDateInput(d)
            const isSelected = dStr === focusedStr
            const isTodayPill = dStr === todayStr
            const count = eventos.filter((ev) => eventoOcurreEn(ev, dStr)).length
            return (
              <Pressable
                key={dStr}
                onPress={() => goTo(d)}
                className={`flex-1 items-center mx-0.5 py-2 rounded-xl ${isSelected ? 'bg-igb-yellow' : isTodayPill ? 'bg-igb-yellow/10' : ''}`}
              >
                <Text className={`text-xs ${isSelected ? 'text-igb-on-yellow' : 'text-igb-secondary'}`}>{DIAS[i]}</Text>
                <Text className={`text-base font-semibold ${isSelected ? 'text-igb-on-yellow' : 'text-igb-on-surface'}`}>{d.getDate()}</Text>
                {count > 0 && <View className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-igb-on-yellow' : 'bg-igb-navy'}`} />}
              </Pressable>
            )
          })}
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#f5d100" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center px-4 pt-8">
          <Text className="text-red-600 text-center">{error}</Text>
        </View>
      ) : (
        <ScrollView
          ref={timelineRef}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 96 }}
          onScroll={handleScroll}
          scrollEventThrottle={100}
        >
          <View style={{ height: days.length * DAY_HEIGHT }}>
            {days.map((d, i) => {
              const dStr = toDateInput(d)
              return (
                <View key={dStr} className="absolute left-0 right-0 flex-row" style={{ top: i * DAY_HEIGHT, height: DAY_HEIGHT }}>
                  <View style={{ width: 48 }}>
                    {HOURS.map((h) => (
                      <View key={h} style={{ height: PX_PER_HOUR }}>
                        {h === 0 && (
                          <Text
                            className={`text-[10px] font-bold pl-1 ${dStr === todayStr ? 'text-igb-yellow-dark' : 'text-igb-on-surface'}`}
                            numberOfLines={1}
                          >
                            {d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' })}
                          </Text>
                        )}
                        <Text className="text-[10px] text-igb-secondary pl-1" style={{ marginTop: h === 0 ? 0 : -6 }}>
                          {String(h).padStart(2, '0')}:00
                        </Text>
                      </View>
                    ))}
                  </View>
                  <View className="flex-1 relative border-l border-igb-outline mr-3">
                    {HOURS.map((h) => (
                      <View key={h} className="absolute left-0 right-0 border-t border-igb-outline" style={{ top: h * PX_PER_HOUR }} />
                    ))}
                  </View>
                </View>
              )
            })}

            {todayIdx !== -1 && (
              <View
                className="absolute left-[48px] right-3 h-[2px] bg-red-500 z-10"
                style={{ top: todayIdx * DAY_HEIGHT + (nowMinutes() / 60) * PX_PER_HOUR }}
              />
            )}

            <View className="absolute top-0" style={{ left: 48, right: 12, height: days.length * DAY_HEIGHT }}>
              {positioned.map(({ ev, top, height, lane, lanes }) => {
                const widthPct = 100 / lanes
                const hasRoomForDetail = height >= 56
                const hasRoomForOperarios = height >= 76 && ev.operarios.length > 0
                return (
                  <Pressable
                    key={ev.id}
                    onPress={() => router.push(`/agenda/evento/${ev.id}`)}
                    className="absolute bg-white border border-igb-outline rounded-lg overflow-hidden flex-row"
                    style={{
                      top,
                      height,
                      left: `${lane * widthPct}%`,
                      width: `${widthPct}%`,
                      paddingRight: lanes > 1 ? 3 : 0,
                    }}
                  >
                    <View className={`w-1 ${estadoStripColor(ev.estado)}`} />
                    <View className="flex-1 px-2 py-1">
                      <Text className="text-[11px] font-bold text-igb-on-surface" numberOfLines={1}>
                        {ev.hora_inicio.slice(0, 5)}{ev.hora_fin ? `-${ev.hora_fin.slice(0, 5)}` : ''}
                      </Text>
                      <Text className="text-xs font-semibold text-igb-on-surface" numberOfLines={1}>
                        {ev.grua?.nombre ?? 'Sin grúa'} — {ev.empresa?.nombre ?? 'Sin empresa'}
                      </Text>
                      {hasRoomForDetail && (
                        <Text className="text-[11px] text-igb-secondary" numberOfLines={1}>
                          {formatEstado(ev.estado)}{ev.ubicacion ? ` · ${ev.ubicacion}` : ''}
                        </Text>
                      )}
                      {hasRoomForOperarios && (
                        <Text className="text-[11px] text-igb-secondary" numberOfLines={1}>
                          {ev.operarios.map((o) => o.nombre).join(', ')}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                )
              })}
            </View>
          </View>
        </ScrollView>
      )}

      <Pressable
        onPress={() => router.push('/agenda/evento/nuevo')}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-igb-yellow items-center justify-center shadow-lg"
      >
        <Text className="text-2xl text-igb-on-yellow">+</Text>
      </Pressable>
    </View>
  )
}
