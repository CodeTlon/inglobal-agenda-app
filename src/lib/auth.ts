import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

/**
 * Auth contra la API del sitio (Better Auth, plugin bearer). Reemplaza al cliente
 * de Supabase Auth: la app guarda UN token de sesión y lo manda como
 * `Authorization: Bearer <token>` en cada request (ver src/lib/api.ts).
 *
 * - Login: POST /api/auth/sign-in/email → el token llega en el header `set-auth-token`.
 * - Sesión: GET /api/auth/get-session valida el token y devuelve el usuario.
 * - El token es corto (cabe en SecureStore sin chunking, a diferencia de un JWT de Supabase).
 */

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? ''
const TOKEN_KEY = 'auth_token'
const TIMEOUT_MS = 20_000

export type AuthUser = { id: string; email: string; mustChangePassword: boolean }
export type AuthSession = { token: string; user: AuthUser }
export type AuthError = { message: string; status: number; code?: string }

// expo-secure-store no tiene implementación en web/SSR (Node): localStorage en el
// navegador, no-op en el servidor de prerender.
async function readToken(): Promise<string | null> {
  if (Platform.OS === 'web') return typeof localStorage === 'undefined' ? null : localStorage.getItem(TOKEN_KEY)
  return SecureStore.getItemAsync(TOKEN_KEY).catch(() => null)
}

async function writeToken(token: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
    return
  }
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token)
  else await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {})
}

export const getToken = readToken

type Listener = (session: AuthSession | null) => void
const listeners = new Set<Listener>()
function emit(session: AuthSession | null) {
  listeners.forEach((l) => l(session))
}

/** Suscripción a cambios de sesión (login/logout). Devuelve la función para desuscribirse. */
export function onAuthChange(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

async function request(path: string, init: RequestInit & { token?: string | null } = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(`${API_BASE}/api/auth${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
      },
    })
  } finally {
    clearTimeout(timeout)
  }
}

/** Valida el token guardado contra el servidor. `null` si no hay sesión o ya no es válida. */
export async function loadSession(): Promise<AuthSession | null> {
  const token = await readToken()
  if (!token) return null
  const res = await request('/get-session', { method: 'GET', token })
  if (res.status === 401 || res.status === 403) {
    await writeToken(null)
    return null
  }
  if (!res.ok) throw new Error(`get-session ${res.status}`)
  const body = await res.json().catch(() => null)
  if (!body?.user) {
    await writeToken(null)
    return null
  }
  return {
    token,
    user: { id: body.user.id, email: body.user.email, mustChangePassword: body.user.mustChangePassword === true },
  }
}

export async function signInWithPassword(email: string, password: string): Promise<{ error?: AuthError }> {
  let res: Response
  try {
    res = await request('/sign-in/email', { method: 'POST', body: JSON.stringify({ email, password }) })
  } catch {
    // Sin red o timeout: status 0 (el login no lo cuenta como intento fallido).
    return { error: { message: 'No se pudo conectar con el servidor.', status: 0 } }
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { error: { message: body.message ?? res.statusText, status: res.status, code: body.code } }
  }
  const token = res.headers.get('set-auth-token')
  if (!token) return { error: { message: 'El servidor no devolvió una sesión.', status: 500 } }
  await writeToken(token)
  emit(await loadSession().catch(() => null))
  return {}
}

/** `remote: false` descarta solo la sesión local (token ya revocado por el servidor). */
export async function signOut(opts: { remote?: boolean } = {}): Promise<void> {
  const token = await readToken()
  if (opts.remote !== false && token) {
    await request('/sign-out', { method: 'POST', token, body: '{}' }).catch(() => {})
  }
  await writeToken(null)
  emit(null)
}
