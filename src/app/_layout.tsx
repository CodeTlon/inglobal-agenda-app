import '../global.css'
import { useEffect, useState } from 'react'
import { Stack, useRouter } from 'expo-router'
import type { NotificationResponse } from 'expo-notifications'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { View, Pressable, StyleSheet } from 'react-native'
import Animated, { Easing, useSharedValue, useAnimatedStyle, withDelay, withTiming, runOnJS } from 'react-native-reanimated'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter'
import { Manrope_700Bold } from '@expo-google-fonts/manrope'
import { Ionicons } from '@expo/vector-icons'
import { useSession, SessionProvider } from '@/lib/session'
import { signOut } from '@/lib/auth'
import { avisosHabilitados, registrarPush, rutaDeAviso } from '@/lib/push'
import { Notifications } from '@/lib/notifications'
import { Text } from '@/components/Text'
import { DialogHost } from '@/components/Dialog'
import { PantallaCarga } from '@/components/PantallaCarga'
import { precargarFotos } from '@/lib/precarga'

SplashScreen.preventAutoHideAsync()

// Panel web del mismo servidor al que apunta la app (producción o test). No se hardcodea el dominio
// final (gruasinglobal.com) porque todavía no está cortado a producción.
const PANEL_WEB = `${(process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/^https?:\/\//, '')}/dashboard`

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-1 items-center justify-center bg-igb-surface p-8">
      {children}
    </View>
  )
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <RootLayoutNav />
    </SessionProvider>
  )
}

let ultimoAvisoAbierto: string | null = null

function RootLayoutNav() {
  const { session, loading, mustChangePassword } = useSession()
  const router = useRouter()

  // Registra el dispositivo para avisos push al tener sesión (si el usuario no los apagó).
  const logueado = !!session && !mustChangePassword
  useEffect(() => {
    if (!logueado) return
    avisosHabilitados().then((on) => on && registrarPush(true))
  }, [logueado])

  // Tocar un aviso abre la pantalla correspondiente (incluye app cerrada).
  useEffect(() => {
    if (!logueado || !Notifications) return
    const abrir = (r: NotificationResponse | null) => {
      // getLastNotificationResponseAsync devuelve siempre el último toque: sin esto se
      // reabriría la misma pantalla al volver a loguearse.
      if (!r || r.notification.request.identifier === ultimoAvisoAbierto) return
      ultimoAvisoAbierto = r.notification.request.identifier
      router.push(rutaDeAviso(r.notification.request.content.data) as never)
    }
    Notifications.getLastNotificationResponseAsync().then(abrir).catch(() => {})
    const sub = Notifications.addNotificationResponseReceivedListener(abrir)
    return () => sub.remove()
  }, [logueado, router])

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Manrope_700Bold,
    // El bottom tab bar (TabBarIcon) usa Ionicons dentro de un componente que
    // React Navigation solo re-renderiza al cambiar de tab enfocado — si el
    // font de Ionicons todavía no había cargado en su primer render, quedaba
    // con el ícono y el label invisibles para siempre (nunca se re-dibuja
    // solo). El resto de la app no lo sufre porque las pantallas normales sí
    // se re-renderizan seguido y "autocuran" apenas el font está listo.
    ...Ionicons.font,
  })

  // Se oculta el splash nativo apenas monta este árbol (no cuando terminan
  // las fuentes): así la pantalla de abajo (isotipo + "Desarrollado por
  // CodeTlon") queda visible durante TODO el hueco entre splash nativo y app
  // lista, en vez de una carrera entre fontsLoaded y la sesión donde a veces
  // ninguno de los dos alcanza a mostrarse.
  useEffect(() => {
    SplashScreen.hideAsync()
  }, [])

  // Piso de tiempo propio: fuentes + sesión suelen resolver en menos de un
  // segundo, muy poco para que se alcance a ver la marca. Mínimo de 1,8 s en pantalla.
  const [pisoCumplido, setPisoCumplido] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setPisoCumplido(true), 1800)
    return () => clearTimeout(t)
  }, [])

  // Con sesión, la pantalla de carga espera también a que las fotos de los catálogos estén en el
  // caché (con tope de 4 s, ver lib/precarga.ts); sin sesión no hay nada que bajar.
  const [fotosPrecargadas, setFotosPrecargadas] = useState(false)
  const haySesion = !!session
  useEffect(() => {
    if (loading || !haySesion) return
    let vivo = true
    precargarFotos().finally(() => vivo && setFotosPrecargadas(true))
    return () => {
      vivo = false
    }
  }, [loading, haySesion])

  const cargando = !fontsLoaded || loading || !pisoCumplido || (haySesion && !fotosPrecargadas)

  // Cross-fade en vez de corte duro: la pantalla de carga se desvanece
  // mientras el contenido de abajo (ya montado, tapado) aparece debajo —
  // sin esto el swap era instantáneo y de paso exponía un frame en blanco
  // mientras el Stack/Tabs de abajo recién estaban montando.
  const [loadingUnmounted, setLoadingUnmounted] = useState(false)
  const loadingOpacity = useSharedValue(1)
  useEffect(() => {
    if (cargando) return
    // Pequeña pausa para que la barra llegue al 100 %, y salida de 450 ms (antes 280 ms, se sentía como un corte).
    loadingOpacity.value = withDelay(220, withTiming(0, { duration: 450, easing: Easing.inOut(Easing.quad) }, (finished) => {
      if (finished) runOnJS(setLoadingUnmounted)(true)
    }))
  }, [cargando, loadingOpacity])
  const loadingStyle = useAnimatedStyle(() => ({ opacity: loadingOpacity.value }))

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={cargando ? 'light' : 'dark'} />
      <View style={{ flex: 1 }}>
      {/* Columna centrada de hasta 720 px: en teléfonos ocupa todo el ancho (no cambia nada); en tablets la app
          no se estira a 1000+ px sino que queda como una columna de teléfono grande sobre un fondo neutro. */}
      <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#e1e3e4' }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 720, backgroundColor: '#f8f9fa', overflow: 'hidden' }}>
        {!cargando && (
          session && mustChangePassword ? (
            <CenteredMessage>
              <Text className="text-center font-semibold text-igb-on-surface text-lg mb-2">
                Tenés que cambiar tu contraseña
              </Text>
              <Text className="text-center text-igb-secondary">
                Ingresá al panel web ({PANEL_WEB}) para cambiar tu contraseña temporal antes de usar la app.
              </Text>
              <Pressable onPress={() => signOut()} className="mt-6 py-2 px-4">
                <Text className="text-igb-navy font-semibold">Cerrar sesión</Text>
              </Pressable>
            </CenteredMessage>
          ) : (
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#f8f9fa' } }}>
              <Stack.Screen name="index" />
              <Stack.Protected guard={!!session}>
                <Stack.Screen name="(tabs)" />
              </Stack.Protected>
              <Stack.Protected guard={!session}>
                <Stack.Screen name="(auth)" />
              </Stack.Protected>
            </Stack>
          )
        )}
        </View>
      </View>
      {!loadingUnmounted && (
        <Animated.View
          pointerEvents={cargando ? 'auto' : 'none'}
          style={[StyleSheet.absoluteFill, loadingStyle]}
        >
          <PantallaCarga listo={!cargando} fuentesListas={fontsLoaded} />
        </Animated.View>
      )}
      </View>
      <DialogHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
