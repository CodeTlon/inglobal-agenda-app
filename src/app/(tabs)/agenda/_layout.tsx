import { Stack } from 'expo-router'
import { NavHeader } from '@/components/NavHeader'

export default function AgendaLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#f5d100' }, headerTintColor: '#221b00' }}>
      <Stack.Screen name="index" options={{ header: () => <NavHeader title="Agenda" /> }} />
      <Stack.Screen name="evento/nuevo" options={{ title: 'Nuevo evento', presentation: 'modal' }} />
      <Stack.Screen name="evento/[id]" options={{ title: 'Evento' }} />
    </Stack>
  )
}
