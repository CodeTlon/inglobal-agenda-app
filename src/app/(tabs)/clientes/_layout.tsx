import { Stack } from 'expo-router'

export default function ClientesLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#f5d100' }, headerTintColor: '#221b00' }}>
      <Stack.Screen name="index" options={{ title: 'Clientes' }} />
      <Stack.Screen name="nuevo" options={{ title: 'Nuevo cliente', presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Cliente' }} />
    </Stack>
  )
}
