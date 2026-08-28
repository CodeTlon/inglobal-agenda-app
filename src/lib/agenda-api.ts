import { api } from './api'
import type { EventoAgenda, Grua, EmpresaAgenda, Operario } from './types'

export function getEventosAgenda(desde?: string, hasta?: string) {
  const qs = new URLSearchParams()
  if (desde) qs.set('desde', desde)
  if (hasta) qs.set('hasta', hasta)
  return api.get<EventoAgenda[]>(`/agenda/eventos?${qs}`)
}

export function getEventoAgendaById(id: string) {
  return api.get<EventoAgenda>(`/agenda/eventos/${id}`)
}

// Historial completo (todas las fechas) de una grúa/empresa/operario puntual,
// para su pantalla de detalle en Catálogos.
export function getEventosDeRecurso(tipo: 'gruas' | 'empresas' | 'operarios', id: string) {
  const campo = tipo === 'gruas' ? 'grua_id' : tipo === 'empresas' ? 'empresa_id' : 'operario_id'
  return api.get<EventoAgenda[]>(`/agenda/eventos?${campo}=${id}`)
}

export type EventoPayload = {
  fecha: string
  fecha_hasta?: string | null
  hora_inicio: string
  hora_fin?: string | null
  grua_id: string
  empresa_id: string
  ubicacion?: string | null
  notas?: string | null
  estado: string
  operario_ids: string[]
}

export async function createEvento(payload: EventoPayload) {
  const res = await api.post<{ id: string }>('/agenda/eventos', payload)
  invalidarEventosCache()
  return res
}

export async function updateEvento(id: string, payload: EventoPayload) {
  const res = await api.patch<{ id: string }>(`/agenda/eventos/${id}`, payload)
  invalidarEventosCache()
  return res
}

export async function deleteEvento(id: string) {
  const res = await api.delete<{ id: string }>(`/agenda/eventos/${id}`)
  invalidarEventosCache()
  return res
}

// ─── Cache de eventos por rango ─────────────────────────────────────────────
// Mes/semana/día cada uno pedía getEventosAgenda desde cero al cambiar de
// vista, aunque el rango ya lo hubiera traído la vista anterior (ej. entrar a
// una semana puntual desde el mes). Este cache evita ese refetch: si el rango
// pedido ya está cubierto por el último fetch, se filtra en memoria.
let eventosCache: { desde: string; hasta: string; data: EventoAgenda[] } | null = null
// Se incrementa en cada invalidación — un fetch lento en vuelo cuya
// `generation` quedó vieja no debe pisar el cache al resolver (ver abajo).
let cacheGeneration = 0
// Techo del rango acumulado: el scroll infinito de la vista Día no tiene
// límite (ver INITIAL_BEFORE/EXTEND_CHUNK en agenda/index.tsx) y este cache
// solo se ensanchaba (min/max) sin recortar nunca — una sesión larga
// scrolleando acumulaba en memoria cada vez más días.
const MAX_CACHE_DAYS = 120

function daysBetween(desde: string, hasta: string): number {
  return Math.round((new Date(`${hasta}T00:00:00`).getTime() - new Date(`${desde}T00:00:00`).getTime()) / 86_400_000)
}

function invalidarEventosCache() {
  eventosCache = null
  cacheGeneration++
}

function eventoSeSuperponeCon(ev: EventoAgenda, desde: string, hasta: string): boolean {
  return ev.fecha <= hasta && desde <= (ev.fecha_hasta ?? ev.fecha)
}

export async function getEventosAgendaCached(desde: string, hasta: string): Promise<EventoAgenda[]> {
  if (eventosCache && eventosCache.desde <= desde && hasta <= eventosCache.hasta) {
    return eventosCache.data.filter((ev) => eventoSeSuperponeCon(ev, desde, hasta))
  }
  const nuevoDesde = eventosCache && eventosCache.desde < desde ? eventosCache.desde : desde
  const nuevoHasta = eventosCache && eventosCache.hasta > hasta ? eventosCache.hasta : hasta
  const generation = cacheGeneration
  const data = await getEventosAgenda(nuevoDesde, nuevoHasta)
  // Si mientras esperábamos hubo una invalidación (crear/editar/borrar un
  // evento) o un fetch más nuevo ya escribió el cache, esta respuesta puede
  // llegar tarde y pisarlo con datos viejos — solo escribimos si seguimos
  // siendo la generación vigente.
  if (generation === cacheGeneration) {
    if (daysBetween(nuevoDesde, nuevoHasta) <= MAX_CACHE_DAYS) {
      eventosCache = { desde: nuevoDesde, hasta: nuevoHasta, data }
    } else {
      // Unir con lo ya cacheado se pasaría del techo — en vez de acumular
      // sin límite, arrancamos de nuevo desde lo recién pedido.
      eventosCache = { desde, hasta, data: data.filter((ev) => eventoSeSuperponeCon(ev, desde, hasta)) }
    }
  }
  return data.filter((ev) => eventoSeSuperponeCon(ev, desde, hasta))
}

export function getRecursosOcupados(params: {
  fecha: string
  fechaHasta?: string | null
  horaInicio: string
  horaFin?: string | null
  excludeEventoId?: string
}) {
  const qs = new URLSearchParams({ fecha: params.fecha, horaInicio: params.horaInicio })
  if (params.fechaHasta) qs.set('fechaHasta', params.fechaHasta)
  if (params.horaFin) qs.set('horaFin', params.horaFin)
  if (params.excludeEventoId) qs.set('excludeEventoId', params.excludeEventoId)
  return api.get<{ gruaIds: string[]; operarioIds: string[] }>(`/agenda/recursos-ocupados?${qs}`)
}

// ─── Catálogos ──────────────────────────────────────────────────────────────

export function getGruas(includeInactive = false) {
  return api.get<Grua[]>(`/agenda/gruas?includeInactive=${includeInactive}`)
}
export type GruaPayload = { nombre: string; patente: string; capacidad_toneladas: number; tipo: string }
export function createGrua(payload: GruaPayload) {
  return api.post<{ id: string }>('/agenda/gruas', payload)
}
export function updateGrua(id: string, payload: GruaPayload) {
  return api.patch<{ id: string }>(`/agenda/gruas/${id}`, payload)
}
export function toggleGrua(id: string, activo: boolean) {
  return api.patch<{ id: string }>(`/agenda/gruas/${id}`, { activo })
}
export function deleteGrua(id: string) {
  return api.delete<{ id: string }>(`/agenda/gruas/${id}`)
}

export function getEmpresasAgenda(includeInactive = false) {
  return api.get<EmpresaAgenda[]>(`/agenda/empresas?includeInactive=${includeInactive}`)
}
export type EmpresaPayload = { nombre: string; contacto: string; telefono: string; notas?: string | null; logo_url?: string | null }
export function createEmpresaAgenda(payload: EmpresaPayload) {
  return api.post<{ id: string }>('/agenda/empresas', payload)
}
export function updateEmpresaAgenda(id: string, payload: EmpresaPayload) {
  return api.patch<{ id: string }>(`/agenda/empresas/${id}`, payload)
}
export function toggleEmpresaAgenda(id: string, activo: boolean) {
  return api.patch<{ id: string }>(`/agenda/empresas/${id}`, { activo })
}
export function deleteEmpresaAgenda(id: string) {
  return api.delete<{ id: string }>(`/agenda/empresas/${id}`)
}

export function getOperarios(includeInactive = false) {
  return api.get<Operario[]>(`/agenda/operarios?includeInactive=${includeInactive}`)
}
export type OperarioPayload = { nombre: string; telefono: string }
export function createOperario(payload: OperarioPayload) {
  return api.post<{ id: string }>('/agenda/operarios', payload)
}
export function updateOperario(id: string, payload: OperarioPayload) {
  return api.patch<{ id: string }>(`/agenda/operarios/${id}`, payload)
}
export function toggleOperario(id: string, activo: boolean) {
  return api.patch<{ id: string }>(`/agenda/operarios/${id}`, { activo })
}
export function deleteOperario(id: string) {
  return api.delete<{ id: string }>(`/agenda/operarios/${id}`)
}
