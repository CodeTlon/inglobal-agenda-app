import { useCallback, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { getEventosAgendaCached } from './agenda-api'
import { ApiError } from './api'
import { toDateInput } from './agenda-view'
import type { EventoAgenda } from './types'
import type { CatalogEstado } from '@/components/CatalogRow'

export const ESTADOS_VIVOS = ['reserva', 'programado', 'en_curso']

/**
 * Carga un catálogo (grúas/operarios) + los eventos de hoy, y arma
 * `estadoDe` (Disponible/Ocupado para CatalogRow) — la parte que
 * GruasScreen/OperariosScreen repetían casi byte a byte, distinguiéndose solo
 * en cómo cada evento matchea contra el item (`grua_id` vs `operarios[]`).
 * Empresas no usa esto — sin concepto de ocupación en el catálogo.
 *
 * Disponible/Ocupado siempre es respecto al día real de hoy, sin importar
 * qué día se esté mirando en el calendario de Agenda.
 */
export function useOcupacionDelDia<T extends { id: string; activo: boolean }>(
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
    const hoy = toDateInput(new Date())
    Promise.all([fetchCatalogo(true), getEventosAgendaCached(hoy, hoy)])
      .then(([list, evs]) => {
        setItems(list)
        setEventosDelDia(evs)
      })
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : errorMsg))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  // Disponible/Ocupado según si hay un evento vivo (no cancelado/finalizado)
  // hoy que matchee con este item — no hay campo de estado propio en el
  // catálogo.
  function estadoDe(item: T): CatalogEstado | undefined {
    if (!item.activo) return undefined
    const ocupado = eventosDelDia.find((ev) => ESTADOS_VIVOS.includes(ev.estado) && matcher(ev, item))
    if (!ocupado) return { kind: 'disponible' }
    return { kind: 'ocupado', detail: `Libera ~${(ocupado.hora_fin ?? '18:00').slice(0, 5)}` }
  }

  return { items, loading, loadError, load, estadoDe }
}

/**
 * Orden de catálogo: activos antes que inactivos, y dentro de los activos
 * disponibles antes que ocupados (nunca oculta nada, solo prioriza).
 */
export function ordenarCatalogo<T extends { activo: boolean }>(
  items: T[],
  estadoDe: (item: T) => CatalogEstado | undefined,
): T[] {
  return [...items].sort((a, b) => {
    if (a.activo !== b.activo) return a.activo ? -1 : 1
    const aOcupado = estadoDe(a)?.kind === 'ocupado' ? 1 : 0
    const bOcupado = estadoDe(b)?.kind === 'ocupado' ? 1 : 0
    return aOcupado - bOcupado
  })
}
