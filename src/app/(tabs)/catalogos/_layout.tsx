import { Stack } from 'expo-router'
import { NavHeader } from '@/components/NavHeader'

export default function CatalogosLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#1C357F' }, headerTintColor: '#fff' }}>
      <Stack.Screen name="index" options={{ header: () => <NavHeader eyebrow="Gestión de flota" title="Catálogos" /> }} />
    </Stack>
  )
}
