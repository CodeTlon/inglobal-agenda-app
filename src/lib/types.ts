// Mismas formas que lib/agenda.ts / lib/validations/agenda.ts en inglobal-site —
// la API (app/api/agenda/**) devuelve estos objetos tal cual.

export const ESTADOS_EVENTO = ['reserva', 'programado', 'en_curso', 'finalizado', 'cancelado'] as const
export type EstadoEvento = (typeof ESTADOS_EVENTO)[number]

export const TRANSICIONES_VALIDAS: Record<EstadoEvento, EstadoEvento[]> = {
  reserva: ['programado', 'cancelado'],
  programado: ['en_curso', 'cancelado'],
  en_curso: ['finalizado', 'cancelado'],
  finalizado: [],
  cancelado: [],
}

export const TIPOS_GRUA = ['Grúa', 'Hidrogrúa', 'Camión', 'Otro'] as const

export interface Grua {
  id: string
  nombre: string
  patente: string | null
  capacidad_toneladas: number | null
  tipo: string
  foto_url: string | null
  activo: boolean
  created_at: string
}

export interface EmpresaAgenda {
  id: string
  nombre: string
  contacto: string | null
  telefono: string | null
  notas: string | null
  logo_url: string | null
  activo: boolean
  created_at: string
}

export interface Operario {
  id: string
  nombre: string
  telefono: string | null
  foto_url: string | null
  activo: boolean
  created_at: string
}

export interface EventoAgenda {
  id: string
  fecha: string
  fecha_hasta: string | null
  hora_inicio: string
  hora_fin: string | null
  grua_id: string | null
  empresa_id: string | null
  ubicacion: string | null
  notas: string | null
  estado: EstadoEvento
  created_at: string
  updated_at: string
  grua: { nombre: string } | null
  empresa: { nombre: string } | null
  operarios: { id: string; nombre: string }[]
}
