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
  let res: Response
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(opts.headers ?? {}),
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
    })
  } catch {
    // fetch() rechaza con TypeError en falla de red (offline/DNS/timeout), no
    // con una respuesta — sin este catch quedaba sin envolver como ApiError y
    // cada caller que hace `e instanceof ApiError` caía siempre al mensaje
    // genérico sin poder distinguir "sin conexión" de un error real del server.
    throw new ApiError('No se pudo conectar con el servidor. Revisá tu conexión.', 0)
  }
  // Si el body no es JSON (ej. 502 de un proxy devolviendo HTML), `body.error`
  // queda undefined — usamos `res.statusText` antes que el genérico "Error
  // desconocido" para no perder toda pista del error real.
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    // El backend revocó el token (usuario desactivado, sesión inválida) pero
    // la sesión local de Supabase seguía "viva" — sin esto el usuario
    // quedaba navegando la app viendo errores genéricos en cada pantalla,
    // sin ninguna señal de que tenía que volver a loguearse.
    if (res.status === 401) supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    throw new ApiError(body.error ?? res.statusText ?? 'Error desconocido', res.status)
  }
  return body.data
}

export const api = {
  get: <T = unknown>(path: string): Promise<T> => apiFetch(path),
  post: <T = unknown>(path: string, body: unknown): Promise<T> => apiFetch(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T = unknown>(path: string, body: unknown): Promise<T> => apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T = unknown>(path: string): Promise<T> => apiFetch(path, { method: 'DELETE' }),
}
