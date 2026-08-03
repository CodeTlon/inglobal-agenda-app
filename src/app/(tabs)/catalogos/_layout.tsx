import { Stack } from 'expo-router'

export default function CatalogosLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#f5d100' }, headerTintColor: '#221b00' }}>
      <Stack.Screen name="index" options={{ title: 'Catálogos' }} />
      <Stack.Screen name="gruas" options={{ title: 'Grúas' }} />
      <Stack.Screen name="empresas" options={{ title: 'Empresas' }} />
      <Stack.Screen name="operarios" options={{ title: 'Operarios' }} />
    </Stack>
  )
}
