import { Stack } from 'expo-router'
import { NavHeader } from '@/components/NavHeader'

export default function CatalogosLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#f5d100' }, headerTintColor: '#221b00' }}>
      <Stack.Screen name="index" options={{ header: () => <NavHeader /> }} />
    </Stack>
  )
}
