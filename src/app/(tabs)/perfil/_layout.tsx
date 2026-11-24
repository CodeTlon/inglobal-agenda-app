import { Stack } from 'expo-router'
import { NavHeader } from '@/components/NavHeader'

// Si se entra directo a una pantalla interna (aviso push, link), queda la lista debajo y el header muestra "volver".
export const unstable_settings = { initialRouteName: 'index' }

export default function PerfilLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#1C357F' }, headerTintColor: '#fff' }}>
      <Stack.Screen name="index" options={{ title: 'Perfil', header: () => <NavHeader eyebrow="Mi cuenta" title="Perfil" /> }} />
      <Stack.Screen name="pair-tv" options={{ title: 'Vincular TV' }} />
    </Stack>
  )
}
