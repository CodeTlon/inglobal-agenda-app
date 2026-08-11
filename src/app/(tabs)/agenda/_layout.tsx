import { Stack } from 'expo-router'
import { NavHeader } from '@/components/NavHeader'

export default function AgendaLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#1C357F' }, headerTintColor: '#fff' }}>
      <Stack.Screen name="index" options={{ header: () => <NavHeader eyebrow="Despacho" title="Agenda" /> }} />
      <Stack.Screen name="evento/nuevo" options={{ title: 'Nuevo evento', presentation: 'modal' }} />
      <Stack.Screen name="evento/[id]" options={{ title: 'Evento' }} />
    </Stack>
  )
}
