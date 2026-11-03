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
// Último usuario validado: permite abrir la app con la sesión guardada cuando el servidor no responde.
const USER_KEY = 'auth_user'
const TIMEOUT_MS = 20_000

// iOS puede lanzar la app en segundo plano (prewarming, avisos) con el teléfono bloqueado. Con el default
// de SecureStore (WHEN_UNLOCKED) el Keychain rechaza la lectura y la app arrancaba "sin sesión": al abrirla
// mostraba el login aunque el token siguiera guardado y vivo en el servidor. AFTER_FIRST_UNLOCK lo deja leer
// en cualquier momento después del primer desbloqueo desde que se prendió el teléfono.
export const STORE_OPTS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK }

export type AuthUser = { id: string; email: string; mustChangePassword: boolean }
export type AuthSession = { token: string; user: AuthUser }
export type AuthError = { message: string; status: number; code?: string }

// expo-secure-store no tiene implementación en web/SSR (Node): localStorage en el
// navegador, no-op en el servidor de prerender.
// Rechaza si el almacenamiento no se puede leer (Keychain bloqueado): eso NO significa "no hay sesión".
async function readItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return typeof localStorage === 'undefined' ? null : localStorage.getItem(key)
  return SecureStore.getItemAsync(key, STORE_OPTS)
}

async function writeItem(key: string, value: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
    return
  }
  // Borrar antes de escribir: en iOS, actualizar un ítem existente cambia el valor pero no su accesibilidad,
  // así que los tokens guardados con WHEN_UNLOCKED solo pasan a AFTER_FIRST_UNLOCK si se recrean.
  await SecureStore.deleteItemAsync(key, STORE_OPTS).catch(() => {})
  if (value) await SecureStore.setItemAsync(key, value, STORE_OPTS)
}

async function writeToken(token: string | null): Promise<void> {
  await writeItem(TOKEN_KEY, token)
  if (!token) await writeItem(USER_KEY, null).catch(() => {})
}

async function saveSession(session: AuthSession): Promise<void> {
  await writeItem(TOKEN_KEY, session.token)
  await writeItem(USER_KEY, JSON.stringify(session.user)).catch(() => {})
}

async function cachedUser(): Promise<AuthUser | null> {
  const raw = await readItem(USER_KEY).catch(() => null)
  if (!raw) return null
  try {
    const u = JSON.parse(raw)
    return typeof u?.id === 'string' && typeof u?.email === 'string' ? { id: u.id, email: u.email, mustChangePassword: u.mustChangePassword === true } : null
  } catch {
    return null
  }
}

function toUser(u: { id: string; email: string; mustChangePassword?: unknown }): AuthUser {
  return { id: u.id, email: u.email, mustChangePassword: u.mustChangePassword === true }
}

export const getToken = () => readItem(TOKEN_KEY).catch(() => null)

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
      // Solo Bearer: sin cookies. El servidor también devuelve una cookie al iniciar sesión; si el teléfono la
      // guardara y la reenviara (sin Origin, como hace una app nativa), el sign-out daba 403 y la sesión
      // quedaba viva en el servidor (la app ignora ese error y borra solo el token local).
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
      },
    })
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Valida el token guardado contra el servidor. `null` solo si no hay token o el servidor dijo que ya no
 * es válido (Better Auth responde 200 con `null` en ese caso). Si el servidor no responde (sin red,
 * timeout, 5xx) se usa el último usuario validado; sin él, rechaza. También rechaza si el almacenamiento
 * no se pudo leer: quien llama debe reintentar, nunca tratarlo como "sin sesión".
 */
export async function loadSession(): Promise<AuthSession | null> {
  const token = await readItem(TOKEN_KEY)
  if (!token) return null

  const sinServidor = async (motivo: string): Promise<AuthSession> => {
    const user = await cachedUser()
    if (user) return { token, user }
    throw new Error(motivo)
  }

  let res: Response
  try {
    res = await request('/get-session', { method: 'GET', token })
  } catch {
    return sinServidor('get-session sin respuesta')
  }
  if (res.status === 401 || res.status === 403) {
    await writeToken(null)
    return null
  }
  if (!res.ok) return sinServidor(`get-session ${res.status}`)
  const body = await res.json().catch(() => undefined)
  if (body === undefined) return sinServidor('get-session respuesta inválida')
  if (!body?.user) {
    await writeToken(null)
    return null
  }
  const session = { token, user: toUser(body.user) }
  // Se reescribe en cada arranque validado: migra los tokens viejos a AFTER_FIRST_UNLOCK y refresca el usuario.
  await saveSession(session).catch(() => {})
  return session
}

/**
 * Arranque rápido: si hay token y un usuario validado guardado, devuelve esa sesión al instante y la valida
 * contra el servidor por detrás (antes la pantalla de carga esperaba esa respuesta, hasta 20 s con mala señal).
 * Si el servidor dice que el token ya no vale, avisa `null` por `onAuthChange`; si valida, avisa la sesión
 * actualizada (por ejemplo, si cambió `mustChangePassword`). Sin usuario guardado se comporta como `loadSession`.
 */
export async function loadSessionRapida(): Promise<AuthSession | null> {
  const token = await readItem(TOKEN_KEY)
  if (!token) return null
  const user = await cachedUser()
  if (!user) return loadSession()
  loadSession()
    .then((s) => {
      if (!s) emit(null)
      else if (s.user.mustChangePassword !== user.mustChangePassword || s.user.email !== user.email) emit(s)
    })
    .catch(() => {})
  return { token, user }
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
  const body = await res.json().catch(() => null)
  await writeToken(token)
  // La respuesta del login ya trae el usuario: si validar con get-session falla por la red, se usa ese.
  const session = await loadSession().catch(() => null)
  if (session) emit(session)
  else if (body?.user?.id) {
    const fallback = { token, user: toUser(body.user) }
    await saveSession(fallback).catch(() => {})
    emit(fallback)
  } else emit(null)
  return {}
}

/** `remote: false` descarta solo la sesión local (token ya revocado por el servidor). */
export async function signOut(opts: { remote?: boolean } = {}): Promise<void> {
  const token = await getToken()
  if (opts.remote !== false && token) {
    await request('/sign-out', { method: 'POST', token, body: '{}' }).catch(() => {})
  }
  await writeToken(null)
  emit(null)
}
