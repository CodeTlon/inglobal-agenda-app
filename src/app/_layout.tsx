import '../global.css'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { View, ActivityIndicator, Text } from 'react-native'
import { useSession } from '@/lib/session'

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-1 items-center justify-center bg-igb-surface p-8">
      {children}
    </View>
  )
}

export default function RootLayout() {
  const { session, loading, mustChangePassword } = useSession()

  return (
    <SafeAreaProvider>
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
