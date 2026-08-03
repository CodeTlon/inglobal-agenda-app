import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { getEventosAgenda } from '@/lib/agenda-api'
import { getWeekStart, getWeekDays, addDays, toDateInput } from '@/lib/agenda-view'
import { EstadoBadge } from '@/components/EstadoBadge'
import type { EventoAgenda } from '@/lib/types'

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function eventoOcurreEn(ev: EventoAgenda, fecha: string): boolean {
  const fin = ev.fecha_hasta ?? ev.fecha
  return ev.fecha <= fecha && fecha <= fin
}

export default function AgendaScreen() {
  const router = useRouter()
  const [selected, setSelected] = useState(() => new Date())
  const [eventos, setEventos] = useState<EventoAgenda[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const weekStart = getWeekStart(selected)
  const weekDays = getWeekDays(weekStart)

  const load = useCallback(async () => {
    setError(null)
    try {
      const desde = toDateInput(weekStart)
      const hasta = toDateInput(addDays(weekStart, 6))
      const data = await getEventosAgenda(desde, hasta)
      setEventos(data)
    } catch {
      setError('No se pudieron cargar los eventos.')
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
  const eventosDelDia = eventos
    .filter((ev) => eventoOcurreEn(ev, selectedStr))
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))

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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
          {weekDays.map((d, i) => {
            const dStr = toDateInput(d)
            const isSelected = dStr === selectedStr
            const count = eventos.filter((ev) => eventoOcurreEn(ev, dStr)).length
            return (
              <Pressable
                key={dStr}
                onPress={() => setSelected(d)}
                className={`items-center mx-1 px-3 py-2 rounded-xl ${isSelected ? 'bg-igb-yellow' : ''}`}
              >
                <Text className={`text-xs ${isSelected ? 'text-igb-on-yellow' : 'text-igb-secondary'}`}>{DIAS[i]}</Text>
                <Text className={`text-base font-semibold ${isSelected ? 'text-igb-on-yellow' : 'text-igb-on-surface'}`}>{d.getDate()}</Text>
                {count > 0 && <View className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-igb-on-yellow' : 'bg-igb-navy'}`} />}
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#f5d100" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4 pt-4"
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
        >
          {error && <Text className="text-red-600 mb-3">{error}</Text>}
          {eventosDelDia.length === 0 && !error && (
            <Text className="text-igb-secondary text-center mt-8">Sin eventos este día.</Text>
          )}
          {eventosDelDia.map((ev) => (
            <Pressable
              key={ev.id}
              onPress={() => router.push(`/agenda/evento/${ev.id}`)}
              className="bg-white border border-igb-outline rounded-xl p-4 mb-3"
            >
              <View className="flex-row justify-between items-start mb-1">
                <Text className="font-bold text-igb-on-surface">
                  {ev.hora_inicio.slice(0, 5)}{ev.hora_fin ? ` - ${ev.hora_fin.slice(0, 5)}` : ''}
                </Text>
                <EstadoBadge estado={ev.estado} />
              </View>
              <Text className="text-igb-on-surface">{ev.grua?.nombre ?? 'Sin grúa'} — {ev.empresa?.nombre ?? 'Sin empresa'}</Text>
              {ev.ubicacion && <Text className="text-igb-secondary text-sm mt-0.5">{ev.ubicacion}</Text>}
              {ev.operarios.length > 0 && (
                <Text className="text-igb-secondary text-sm mt-0.5">
                  {ev.operarios.map((o) => o.nombre).join(', ')}
                </Text>
              )}
            </Pressable>
          ))}
          <View className="h-24" />
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
