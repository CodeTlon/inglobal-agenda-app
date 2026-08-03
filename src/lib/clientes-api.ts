import { api } from './api'
import type { Cliente } from './types'

export type ClientePayload = {
  name: string
  logo: string
  logo_focal?: string | null
  logo_focal_mobile?: string | null
  bio?: string
  content?: string
  featured: boolean
  work_rank: number
  published: boolean
}

export const getClientes = () => api.get<Cliente[]>('/clientes')
export const getClienteById = (id: string) => api.get<Cliente>(`/clientes/${id}`)
export const createCliente = (payload: ClientePayload) => api.post<{ id: string }>('/clientes', payload)
export const updateCliente = (id: string, payload: ClientePayload) => api.patch<{ id: string }>(`/clientes/${id}`, payload)
export const deleteCliente = (id: string) => api.delete<{ id: string }>(`/clientes/${id}`)
