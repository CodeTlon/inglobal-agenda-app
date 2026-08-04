import '../global.css'
import { useCallback } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { View, ActivityIndicator } from 'react-native'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter'
import { Manrope_700Bold } from '@expo-google-fonts/manrope'
import { useSession } from '@/lib/session'
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
  })

  const onLayout = useCallback(() => {
    if (fontsLoaded) SplashScreen.hideAsync()
  }, [fontsLoaded])

  if (!fontsLoaded) return null

  return (
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
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!!session}>
            <Stack.Screen name="(tabs)" />
          </Stack.Protected>
          <Stack.Protected guard={!session}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
        </Stack>
      )}
    </SafeAreaProvider>
  )
}
