import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

// A diferencia de los dos demos de referencia (sedo-gym-app/torneo-imperial-app), acá la
// sesión SÍ se persiste — expo-secure-store en vez de una sesión en memoria que se pierde
// al recargar la app. Mismo mecanismo de auth que el dashboard web (email+password,
// Supabase Auth), las cuentas se siguen creando a mano desde /dashboard/usuarios.
const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
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
