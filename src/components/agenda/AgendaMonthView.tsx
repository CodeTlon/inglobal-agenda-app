import { useCallback, useRef, useState } from 'react'
import { View, Pressable, ActivityIndicator } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { Text } from '@/components/Text'
import { getEventosAgendaCached } from '@/lib/agenda-api'
import { ApiError } from '@/lib/api'
import { getMonthMatrix, toDateInput, estadoStripColor, getEstadoVisual } from '@/lib/agenda-view'
import type { EventoAgenda } from '@/lib/types'
import { EstadoLegend } from '@/components/EstadoLegend'
import { colors } from '@/lib/colors'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MAX_DOTS = 4

function eventoOcurreEn(ev: EventoAgenda, fecha: string): boolean {
  return ev.fecha <= fecha && fecha <= (ev.fecha_hasta ?? ev.fecha)
}

export function AgendaMonthView({
  month,
  focusedStr,
  onSelectDay,
  onChangeMonth,
}: {
  month: Date
  focusedStr: string
  onSelectDay: (d: Date) => void
  onChangeMonth: (d: Date) => void
}) {
  const [eventos, setEventos] = useState<EventoAgenda[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const weeks = getMonthMatrix(month)
  const today = new Date()
  const todayStr = toDateInput(today)
  // Si el mes que se está mirando no es el actual, no hay "hoy" que pintar
  // ahí — se pinta el día 1 del mes como referencia en su lugar.
  const isCurrentMonthView = month.getMonth() === today.getMonth() && month.getFullYear() === today.getFullYear()
  const desde = toDateInput(weeks[0][0])
  const hasta = toDateInput(weeks[weeks.length - 1][6])

  // useFocusEffect (no un useEffect atado solo a [desde, hasta]) para que
  // también recargue al volver de crear/editar/borrar un evento — antes un
  // evento nuevo no aparecía en Mes hasta cambiar de mes y volver.
  //
  // hasLoadedOnceRef: mismo guard anti-flicker que ya usa Día — sin esto,
  // cada refoco (ej. volver del detalle de un evento) hacía desaparecer
  // toda la grilla detrás de un spinner de pantalla completa aunque los
  // datos ya estuvieran cacheados.
  const hasLoadedOnceRef = useRef(false)
  /* eslint-disable react-hooks/preserve-manual-memoization -- desde/hasta salen de `weeks` (getMonthMatrix), el compiler no puede probar que no mutan; el guard `cancelled` ya evita condiciones de carrera a mano */
  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      if (!hasLoadedOnceRef.current) setLoading(true)
      setError(null)
      getEventosAgendaCached(desde, hasta)
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
    }, [desde, hasta]),
  )
  /* eslint-enable react-hooks/preserve-manual-memoization */

  return (
    <View className="flex-1 bg-igb-surface">
      <View className="bg-white border-b border-igb-outline px-4 pt-3 pb-3">
        <View className="flex-row justify-between items-center">
          <Pressable
            onPress={() => onChangeMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            className="p-2"
          >
            <Text className="text-lg">‹</Text>
          </Pressable>
          <Text className="font-semibold text-igb-on-surface text-base">
            {MESES[month.getMonth()]} {month.getFullYear()}
          </Text>
          <View className="flex-row items-center">
            <Pressable
              onPress={() => onChangeMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              className="p-2"
            >
              <Text className="text-lg">›</Text>
            </Pressable>
            <EstadoLegend />
          </View>
        </View>
        <View className="flex-row mt-2">
          {DIAS_CORTOS.map((d) => (
            <Text key={d} className="flex-1 text-center text-xs text-igb-secondary">
              {d}
            </Text>
          ))}
        </View>
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
        <View className="flex-1 p-2">
          {weeks.map((week, wi) => (
            <View key={wi} className="flex-row flex-1">
              {week.map((day) => {
                const dStr = toDateInput(day)
                const inMonth = day.getMonth() === month.getMonth()
                const isToday = dStr === todayStr
                // Ancla visual: "hoy" si se está mirando el mes actual, o el
                // día 1 del mes si se navegó a otro mes.
                const isAnchor = isCurrentMonthView ? isToday : day.getDate() === 1 && inMonth
                const isFocused = dStr === focusedStr
                const delDia = eventos.filter((ev) => eventoOcurreEn(ev, dStr))
                return (
                  <Pressable
                    key={dStr}
                    onPress={() => onSelectDay(day)}
                    className={`flex-1 m-0.5 rounded-lg border p-1.5 ${
                      isFocused ? 'border-igb-yellow bg-igb-yellow/10' : isAnchor ? 'border-igb-navy/40' : 'border-igb-outline'
                    } ${inMonth ? 'bg-white' : 'bg-igb-surface'}`}
                  >
                    <Text className={`text-xs font-medium ${inMonth ? 'text-igb-on-surface' : 'text-igb-secondary/50'}`}>
                      {day.getDate()}
                    </Text>
                    {delDia.length > 0 && (
                      <View className="flex-row flex-wrap gap-0.5 mt-1">
                        {delDia.slice(0, MAX_DOTS).map((ev) => (
                          <View key={ev.id} className={`w-2 h-2 rounded-full ${estadoStripColor(getEstadoVisual(ev))}`} />
                        ))}
                      </View>
                    )}
                    {delDia.length > MAX_DOTS && (
                      <Text className="text-[10px] text-igb-secondary mt-0.5">+{delDia.length - MAX_DOTS}</Text>
                    )}
                  </Pressable>
                )
              })}
            </View>
          ))}
        </View>
      )}
    </View>
  )
}
