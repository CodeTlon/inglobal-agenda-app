import { Stack } from 'expo-router'

export default function PerfilLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#f5d100' }, headerTintColor: '#221b00' }}>
      <Stack.Screen name="index" options={{ title: 'Perfil' }} />
      <Stack.Screen name="pair-tv" options={{ title: 'Vincular TV' }} />
    </Stack>
  )
}
