import { Stack } from 'expo-router'
import { HeaderLogo } from '@/components/HeaderLogo'

export default function CatalogosLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: '#f5d100' }, headerTintColor: '#221b00' }}>
      <Stack.Screen name="index" options={{ headerTitle: () => <HeaderLogo title="Catálogos" /> }} />
    </Stack>
  )
}
