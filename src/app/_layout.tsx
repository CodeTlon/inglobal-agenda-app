import '../global.css'
import { useCallback, useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { View, ActivityIndicator, Pressable, AppState, LogBox } from 'react-native'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter'
import { Manrope_700Bold } from '@expo-google-fonts/manrope'
import { Ionicons } from '@expo/vector-icons'
import { useSession, SessionProvider } from '@/lib/session'
import { supabase } from '@/lib/supabase'
import { Text } from '@/components/Text'
import { colors } from '@/lib/colors'
import { DialogHost } from '@/components/Dialog'

SplashScreen.preventAutoHideAsync()

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

// El SDK de Supabase pausa/reanuda su ticker de auto-refresh de sesión según
// esto (patrón oficial para RN) — sin esto corre siempre en background, y
// cuando falla un refresh sin red hace console.warn/error, que LogBox
// muestra como una alerta en pantalla ("Auto refresh tick failed...").
// LogBox.ignoreLogs silencia ese warning puntual (es de la librería, no se
// puede envolver en try/catch desde acá) — solo pasa en dev/Expo Go, un
// build de producción no muestra LogBox en pantalla.
LogBox.ignoreLogs(['Auto refresh tick failed', 'AuthRetryableFetchError'])

function RootLayoutNav() {
  const { session, loading, mustChangePassword } = useSession()

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh()
      else supabase.auth.stopAutoRefresh()
    })
    return () => sub.remove()
  }, [])
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

  const onLayout = useCallback(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider onLayout={onLayout}>
        <StatusBar style="dark" />
      {loading ? (
        <CenteredMessage>
          <ActivityIndicator color={colors.yellow} size="large" />
        </CenteredMessage>
      ) : session && mustChangePassword ? (
        <CenteredMessage>
          <Text className="text-center font-semibold text-igb-on-surface text-lg mb-2">
            Tenés que cambiar tu contraseña
          </Text>
          <Text className="text-center text-igb-secondary">
            Ingresá al panel web (gruasinglobal.com/dashboard) para cambiar tu contraseña temporal antes de usar la app.
          </Text>
          <Pressable onPress={() => supabase.auth.signOut()} className="mt-6 py-2 px-4">
            <Text className="text-igb-navy font-semibold">Cerrar sesión</Text>
          </Pressable>
        </CenteredMessage>
      ) : (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Protected guard={!!session}>
            <Stack.Screen name="(tabs)" />
          </Stack.Protected>
          <Stack.Protected guard={!session}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
        </Stack>
      )}
      <DialogHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
