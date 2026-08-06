import { useCallback, useEffect, useRef, useState } from 'react'
import { View, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
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
const DEFAULT_DURATION_MIN = 60
const MIN_CARD_HEIGHT = 44

function eventoOcurreEn(ev: EventoAgenda, fecha: string): boolean {
  const fin = ev.fecha_hasta ?? ev.fecha
  return ev.fecha <= fecha && fecha <= fin
}

function toMinutes(hhmmss: string): number {
  const [h, m] = hhmmss.split(':').map(Number)
  return h * 60 + m
}

function nowMinutes(): number {
  const n = new Date()
  return n.getHours() * 60 + n.getMinutes()
}

export default function AgendaScreen() {
  const router = useRouter()
  const [selected, setSelected] = useState(() => new Date())
  const [eventos, setEventos] = useState<EventoAgenda[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const timelineRef = useRef<ScrollView>(null)

  const weekStart = getWeekStart(selected)
  const weekDays = getWeekDays(weekStart)

  const load = useCallback(async () => {
    setError(null)
    try {
      const desde = toDateInput(weekStart)
      const hasta = toDateInput(addDays(weekStart, 6))
      const data = await getEventosAgenda(desde, hasta)
      setEventos(data)
    } catch (e) {
      // ponytail: mensaje crudo del backend en vez de uno genérico, útil
      // mientras se depura el flujo — cambiar a algo más lindo cuando esté estable.
      setError(e instanceof ApiError ? `Error ${e.status}: ${e.message}` : `Error de red: ${String(e)}`)
    } finally {
      setLoading(false)
    }
  }, [weekStart.getTime()])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      load()
    }, [load]),
  )

  const selectedStr = toDateInput(selected)
  const isToday = selectedStr === toDateInput(new Date())
  const eventosDelDia = eventos
    .filter((ev) => eventoOcurreEn(ev, selectedStr))
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))

  // Al cambiar de día (o terminar de cargar), arranca el scroll un poco antes
  // del primer evento en vez de mostrar medianoche — si no hay eventos, cerca
  // de la hora actual (o las 7am si el día no es hoy).
  useEffect(() => {
    if (loading) return
    const anchorMin = eventosDelDia.length > 0 ? Math.min(...eventosDelDia.map((ev) => toMinutes(ev.hora_inicio))) : isToday ? nowMinutes() : 7 * 60
    const y = Math.max(0, (anchorMin / 60 - 1) * PX_PER_HOUR)
    timelineRef.current?.scrollTo({ y, animated: false })
  }, [selectedStr, loading])

  const layout = layoutDayEvents(eventosDelDia)

  return (
    <View className="flex-1 bg-igb-surface">
      <View className="bg-white border-b border-igb-outline pb-2">
        <View className="flex-row justify-between items-center px-4 pt-3 pb-1">
          <Pressable onPress={() => setSelected(addDays(selected, -7))} className="p-2">
            <Text className="text-lg">‹</Text>
          </Pressable>
          <Text className="font-semibold text-igb-on-surface">
            {weekStart.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })} - {addDays(weekStart, 6).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
          </Text>
          <Pressable onPress={() => setSelected(addDays(selected, 7))} className="p-2">
            <Text className="text-lg">›</Text>
          </Pressable>
        </View>
        <View className="flex-row px-2">
          {weekDays.map((d, i) => {
            const dStr = toDateInput(d)
            const isSelected = dStr === selectedStr
            const isTodayPill = dStr === toDateInput(new Date())
            const count = eventos.filter((ev) => eventoOcurreEn(ev, dStr)).length
            return (
              <Pressable
                key={dStr}
                onPress={() => setSelected(d)}
                className={`flex-1 items-center mx-0.5 py-2 rounded-xl ${isSelected ? 'bg-igb-yellow' : isTodayPill ? 'bg-igb-yellow/10' : ''}`}
              >
                <Text className={`text-xs ${isSelected ? 'text-igb-on-yellow' : 'text-igb-secondary'}`}>{DIAS[i]}</Text>
                <Text className={`text-base font-semibold ${isSelected ? 'text-igb-on-yellow' : 'text-igb-on-surface'}`}>{d.getDate()}</Text>
                {count > 0 && <View className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-igb-on-yellow' : 'bg-igb-navy'}`} />}
              </Pressable>
            )
          })}
        </View>
        <EstadoLegend />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#f5d100" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center px-4 pt-8">
          <Text className="text-red-600 text-center">{error}</Text>
        </View>
      ) : eventosDelDia.length === 0 ? (
        <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
          <Text className="text-igb-secondary text-center mt-8">Sin eventos este día.</Text>
        </ScrollView>
      ) : (
        <ScrollView
          ref={timelineRef}
          className="flex-1"
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
          contentContainerStyle={{ paddingBottom: 96 }}
        >
          <View className="flex-row" style={{ height: 24 * PX_PER_HOUR }}>
            <View style={{ width: 48 }}>
              {HOURS.map((h) => (
                <View key={h} style={{ height: PX_PER_HOUR }}>
                  <Text className="text-[10px] text-igb-secondary pl-1" style={{ marginTop: -6 }}>
                    {String(h).padStart(2, '0')}:00
                  </Text>
                </View>
              ))}
            </View>
            <View className="flex-1 relative border-l border-igb-outline mr-3">
              {HOURS.map((h) => (
                <View key={h} className="absolute left-0 right-0 border-t border-igb-outline" style={{ top: h * PX_PER_HOUR }} />
              ))}
              {isToday && (
                <View className="absolute left-0 right-0 h-[2px] bg-red-500 z-10" style={{ top: (nowMinutes() / 60) * PX_PER_HOUR }} />
              )}
              {eventosDelDia.map((ev) => {
                const startMin = toMinutes(ev.hora_inicio)
                const endMin = ev.hora_fin ? toMinutes(ev.hora_fin) : startMin + DEFAULT_DURATION_MIN
                const slot = layout.get(ev) ?? { lane: 0, lanes: 1 }
                const widthPct = 100 / slot.lanes
                const heightPx = Math.max(((endMin - startMin) / 60) * PX_PER_HOUR, MIN_CARD_HEIGHT)
                const hasRoomForDetail = heightPx >= 56
                const hasRoomForOperarios = heightPx >= 76 && ev.operarios.length > 0
                return (
                  <Pressable
                    key={ev.id}
                    onPress={() => router.push(`/agenda/evento/${ev.id}`)}
                    className="absolute bg-white border border-igb-outline rounded-lg overflow-hidden flex-row"
                    style={{
                      top: (startMin / 60) * PX_PER_HOUR,
                      height: heightPx,
                      left: `${slot.lane * widthPct}%`,
                      width: `${widthPct}%`,
                      paddingRight: slot.lanes > 1 ? 3 : 0,
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
