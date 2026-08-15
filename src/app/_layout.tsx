import '../global.css'
import { useCallback } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { View, ActivityIndicator } from 'react-native'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter'
import { Manrope_700Bold } from '@expo-google-fonts/manrope'
import { Ionicons } from '@expo/vector-icons'
import { useSession } from '@/lib/session'
import { AgendaSelectionProvider } from '@/lib/agenda-selection'
import { Text } from '@/components/Text'

SplashScreen.preventAutoHideAsync()

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-1 items-center justify-center bg-igb-surface p-8">
      {children}
    </View>
  )
}

export default function RootLayout() {
  const { session, loading, mustChangePassword } = useSession()
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
          <ActivityIndicator color="#f5d100" size="large" />
        </CenteredMessage>
      ) : session && mustChangePassword ? (
        <CenteredMessage>
          <Text className="text-center font-semibold text-igb-on-surface text-lg mb-2">
            Tenés que cambiar tu contraseña
          </Text>
          <Text className="text-center text-igb-secondary">
            Ingresá al panel web (gruasinglobal.com/dashboard) para cambiar tu contraseña temporal antes de usar la app.
          </Text>
        </CenteredMessage>
      ) : (
        <AgendaSelectionProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={!!session}>
              <Stack.Screen name="(tabs)" />
            </Stack.Protected>
            <Stack.Protected guard={!session}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
          </Stack>
        </AgendaSelectionProvider>
      )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
