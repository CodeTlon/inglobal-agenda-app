import { useCallback, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { getEventosAgendaCached } from './agenda-api'
import { ApiError } from './api'
import { toDateInput } from './agenda-view'
import type { EventoAgenda } from './types'
import type { CatalogEstado } from '@/components/CatalogRow'

export const ESTADOS_VIVOS = ['reserva', 'programado', 'en_curso']

/**
 * Carga un catálogo (grúas/operarios) + los eventos del día seleccionado, y
 * arma `estadoDe` (Disponible/Ocupado para CatalogRow) — la parte que
 * GruasScreen/OperariosScreen repetían casi byte a byte, distinguiéndose solo
 * en cómo cada evento matchea contra el item (`grua_id` vs `operarios[]`).
 * Empresas no usa esto — sin concepto de ocupación en el catálogo.
 */
export function useOcupacionDelDia<T extends { id: string; activo: boolean }>(
  selectedDate: string,
  fetchCatalogo: (includeInactive: boolean) => Promise<T[]>,
  matcher: (ev: EventoAgenda, item: T) => boolean,
  errorMsg: string,
) {
  const [items, setItems] = useState<T[]>([])
  const [eventosDelDia, setEventosDelDia] = useState<EventoAgenda[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    Promise.all([fetchCatalogo(true), getEventosAgendaCached(selectedDate, selectedDate)])
      .then(([list, evs]) => {
        setItems(list)
        setEventosDelDia(evs)
      })
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : errorMsg))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate])

  useFocusEffect(useCallback(() => { load() }, [load]))

  // Disponible/Ocupado según si hay un evento vivo (no cancelado/finalizado)
  // que matchee con este item y cubra `selectedDate` — no hay campo de
  // estado propio en el catálogo. `selectedDate` es el día que se estaba
  // mirando en Agenda (o hoy, si se entró directo a Catálogos).
  function estadoDe(item: T): CatalogEstado | undefined {
    if (!item.activo) return undefined
    // Fecha pasada: no hay disponibilidad que mostrar, solo sirve para ver
    // trabajos ya hechos.
    if (selectedDate < toDateInput(new Date())) return undefined
    const ocupado = eventosDelDia.find((ev) => ESTADOS_VIVOS.includes(ev.estado) && matcher(ev, item))
    if (!ocupado) return { kind: 'disponible' }
    return { kind: 'ocupado', detail: `Libera ~${(ocupado.hora_fin ?? '18:00').slice(0, 5)}` }
  }

  return { items, loading, loadError, load, estadoDe }
}
