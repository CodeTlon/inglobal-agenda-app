import { supabase } from './supabase'

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? ''

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

// fetch() nativo no tiene timeout — si el backend acepta la conexión y
// después no responde (típico durante un restart del lado de Supabase/
// Vercel), la promesa queda colgada para siempre y toda la app se ve
// "cargando" sin fin, sin ningún error que mostrar. 20s es margen de sobra
// para una conexión lenta real.
const TIMEOUT_MS = 20_000

async function apiFetch(path: string, opts: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  let res: Response
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      ...opts,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(opts.headers ?? {}),
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
    })
  } catch (e) {
    // fetch() rechaza con TypeError en falla de red (offline/DNS) o con
    // AbortError si se cumplió el timeout de arriba — no con una respuesta.
    // Sin este catch quedaba sin envolver como ApiError y cada caller que
    // hace `e instanceof ApiError` caía siempre al mensaje genérico sin
    // poder distinguir "sin conexión"/timeout de un error real del server.
    const timedOut = e instanceof Error && e.name === 'AbortError'
    throw new ApiError(
      timedOut ? 'El servidor no respondió a tiempo. Probá de nuevo.' : 'No se pudo conectar con el servidor. Revisá tu conexión.',
      0,
    )
  } finally {
    clearTimeout(timeout)
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
