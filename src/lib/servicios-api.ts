import { api } from './api'
import type { Servicio } from './types'

export type ServicioPayload = {
  title: string
  desc: string
  excerpt: string
  specs?: string // JSON array stringificado, igual que StringList en el dashboard web
  img: string
  icon: string
  display_order: number
  published: boolean
}

export const getServicios = () => api.get<Servicio[]>('/servicios')
export const getServicioById = (id: string) => api.get<Servicio>(`/servicios/${id}`)
export const createServicio = (payload: ServicioPayload) => api.post<{ id: string }>('/servicios', payload)
export const updateServicio = (id: string, payload: ServicioPayload) => api.patch<{ id: string }>(`/servicios/${id}`, payload)
export const deleteServicio = (id: string) => api.delete<{ id: string }>(`/servicios/${id}`)
