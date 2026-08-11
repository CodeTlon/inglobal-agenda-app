import { Stack } from 'expo-router'
import { NavHeader } from '@/components/NavHeader'

export default function PerfilLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#1C357F' }, headerTintColor: '#fff' }}>
      <Stack.Screen name="index" options={{ header: () => <NavHeader eyebrow="Mi cuenta" title="Perfil" /> }} />
      <Stack.Screen name="pair-tv" options={{ title: 'Vincular TV' }} />
    </Stack>
  )
}
