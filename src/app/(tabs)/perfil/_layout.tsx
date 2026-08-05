import { Stack } from 'expo-router'
import { NavHeader } from '@/components/NavHeader'

export default function PerfilLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#f5d100' }, headerTintColor: '#221b00' }}>
      <Stack.Screen name="index" options={{ header: () => <NavHeader title="Perfil" /> }} />
      <Stack.Screen name="pair-tv" options={{ title: 'Vincular TV' }} />
    </Stack>
  )
}
