import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

// A diferencia de los dos demos de referencia (sedo-gym-app/torneo-imperial-app), acá la
// sesión SÍ se persiste — expo-secure-store en vez de una sesión en memoria que se pierde
// al recargar la app. Mismo mecanismo de auth que el dashboard web (email+password,
// Supabase Auth), las cuentas se siguen creando a mano desde /dashboard/usuarios.
// ponytail: expo-secure-store has no native impl on web/SSR (Node), so it
// crashes there — fall back to localStorage in the browser, no-op on the server.
//
// Android's Keystore-backed SecureStore rejects values over 2048 bytes, and a
// Supabase session (access + refresh JWT) regularly exceeds that — setItemAsync
// threw silently here, the session never persisted, and login looked frozen
// even with correct credentials. Chunk the value across numbered sub-keys to
// stay under the limit. iOS Keychain doesn't have this low a limit, so it
// skips chunking entirely (see NEEDS_CHUNKING below) — one less thing to go
// wrong and no extra latency on every login/refresh there.
const CHUNK_SIZE = 1800
const CHUNK_COUNT_SUFFIX = '_chunks'
const NEEDS_CHUNKING = Platform.OS === 'android'

async function setChunkedItem(key: string, value: string) {
  const oldCountRaw = await SecureStore.getItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`)
  const oldCount = oldCountRaw ? Number(oldCountRaw) : 0
  const count = Math.ceil(value.length / CHUNK_SIZE)
  await Promise.all(
    Array.from({ length: count }, (_, i) =>
      SecureStore.setItemAsync(`${key}_${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE))
    )
  )
  await SecureStore.setItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`, String(count))
  // Un valor nuevo con menos chunks que el anterior (ej. un refresh de
  // token más corto) dejaba huérfanos los índices de más — nunca se
  // borraban, sobrevivían a logout y a logins posteriores. Se borran DESPUÉS
  // de escribir el count nuevo: si el proceso muere acá, el count ya apunta
  // al valor correcto (sin corrupción), solo queda basura para la próxima
  // escritura.
  if (oldCount > count) {
    await Promise.all(
      Array.from({ length: oldCount - count }, (_, i) => SecureStore.deleteItemAsync(`${key}_${count + i}`).catch(() => {})),
    )
  }
}

async function getChunkedItem(key: string): Promise<string | null> {
  const countRaw = await SecureStore.getItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`)
  if (!countRaw) return SecureStore.getItemAsync(key)
  const count = Number(countRaw)
  const chunks = await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}_${i}`)))
  return chunks.some((c) => c === null) ? null : chunks.join('')
}

async function removeChunkedItem(key: string) {
  const countRaw = await SecureStore.getItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`)
  const count = countRaw ? Number(countRaw) : 0
  await Promise.all([
    SecureStore.deleteItemAsync(key).catch(() => {}),
    SecureStore.deleteItemAsync(`${key}${CHUNK_COUNT_SUFFIX}`).catch(() => {}),
    ...Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}_${i}`).catch(() => {})),
  ])
}

const SecureStoreAdapter = {
  getItem: (key: string) => {
    if (Platform.OS !== 'web') return getChunkedItem(key)
    return Promise.resolve(typeof localStorage === 'undefined' ? null : localStorage.getItem(key))
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value)
      return Promise.resolve()
    }
    // getChunkedItem/removeChunkedItem ya saben leer/borrar un valor SIN
    // chunkear (caen a la key plana cuando no hay `_chunks`) — no hace falta
    // tocarlos para que iOS conviva con Android acá, solo evitar el chunking
    // de más al escribir.
    return NEEDS_CHUNKING ? setChunkedItem(key, value) : SecureStore.setItemAsync(key, value)
  },
  removeItem: (key: string) => {
    if (Platform.OS !== 'web') return removeChunkedItem(key)
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key)
    return Promise.resolve()
  },
}

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
