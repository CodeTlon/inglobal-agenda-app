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

export function createEvento(payload: EventoPayload) {
  return api.post<{ id: string }>('/agenda/eventos', payload)
}

export function updateEvento(id: string, payload: EventoPayload) {
  return api.patch<{ id: string }>(`/agenda/eventos/${id}`, payload)
}

export function deleteEvento(id: string) {
  return api.delete<{ id: string }>(`/agenda/eventos/${id}`)
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
export type EmpresaPayload = { nombre: string; contacto: string; telefono: string; notas?: string | null }
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
