import { supabase } from './supabase'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? ''

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function apiFetch(path: string, opts: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers ?? {}),
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(body.error ?? 'Error desconocido', res.status)
  return body.data
}

export const api = {
  get: <T = unknown>(path: string): Promise<T> => apiFetch(path),
  post: <T = unknown>(path: string, body: unknown): Promise<T> => apiFetch(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T = unknown>(path: string, body: unknown): Promise<T> => apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T = unknown>(path: string): Promise<T> => apiFetch(path, { method: 'DELETE' }),
}
