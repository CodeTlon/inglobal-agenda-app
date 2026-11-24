import { Stack } from 'expo-router'
import { NavHeader } from '@/components/NavHeader'

// Si se entra directo a una pantalla interna (aviso push, link), queda la lista debajo y el header muestra "volver".
export const unstable_settings = { initialRouteName: 'index' }

export default function AgendaLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#1C357F' }, headerTintColor: '#fff' }}>
      <Stack.Screen name="index" options={{ title: 'Agenda', header: () => <NavHeader eyebrow="Despacho" title="Agenda" /> }} />
      <Stack.Screen name="evento/nuevo" options={{ title: 'Nuevo evento', presentation: 'modal' }} />
      <Stack.Screen name="evento/[id]" options={{ title: 'Evento' }} />
    </Stack>
  )
}
