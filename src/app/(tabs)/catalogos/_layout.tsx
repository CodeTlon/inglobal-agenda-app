import { Stack } from 'expo-router'
import { NavHeader } from '@/components/NavHeader'

// Si se entra directo a una pantalla interna (aviso push, link), queda la lista debajo y el header muestra "volver".
export const unstable_settings = { initialRouteName: 'index' }

export default function CatalogosLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#1C357F' }, headerTintColor: '#fff' }}>
      <Stack.Screen name="index" options={{ title: 'Catálogos', header: () => <NavHeader eyebrow="Gestión de flota" title="Catálogos" /> }} />
      <Stack.Screen name="recurso/[tipo]/[id]" options={{ title: 'Detalle' }} />
    </Stack>
  )
}
