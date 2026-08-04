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
const SecureStoreAdapter = {
  getItem: (key: string) => {
    if (Platform.OS !== 'web') return SecureStore.getItemAsync(key)
    return Promise.resolve(typeof localStorage === 'undefined' ? null : localStorage.getItem(key))
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS !== 'web') return SecureStore.setItemAsync(key, value)
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value)
    return Promise.resolve()
  },
  removeItem: (key: string) => {
    if (Platform.OS !== 'web') return SecureStore.deleteItemAsync(key)
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
