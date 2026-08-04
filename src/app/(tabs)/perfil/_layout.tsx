import { Stack } from 'expo-router'
import { HeaderLogo } from '@/components/HeaderLogo'

export default function PerfilLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#f5d100' }, headerTintColor: '#221b00' }}>
      <Stack.Screen name="index" options={{ headerTitle: () => <HeaderLogo title="Perfil" /> }} />
      <Stack.Screen name="pair-tv" options={{ title: 'Vincular TV' }} />
    </Stack>
  )
}
