import { Stack } from 'expo-router'

export default function ServiciosLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#f5d100' }, headerTintColor: '#221b00' }}>
      <Stack.Screen name="index" options={{ title: 'Servicios' }} />
      <Stack.Screen name="nuevo" options={{ title: 'Nuevo servicio', presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Servicio' }} />
    </Stack>
  )
}
