import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { useSession } from '@/lib/session'

function TabIcon({ name, focused }: { name: ComponentProps<typeof Ionicons>['name']; focused: boolean }) {
  return <Ionicons name={name} size={22} color={focused ? '#1C357F' : '#1C357F80'} />
}

export default function TabsLayout() {
  // Rol "trabajador": solo agenda + perfil. Catálogos es gestión de contenido
  // admin — el RLS del lado del servidor ya lo bloquea, esto solo evita
  // mostrar una pestaña a la que igual no puede escribir.
  const { session } = useSession()
  // app_metadata (no user_metadata): solo lo escribe el service_role desde el
  // panel web, el propio usuario no puede reescribirlo vía supabase.auth.updateUser.
  const isTrabajador = session?.user.app_metadata?.role === 'trabajador'

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1C357F',
        tabBarInactiveTintColor: '#1C357F80',
        tabBarStyle: { backgroundColor: '#f5d100' },
      }}
    >
      <Tabs.Screen
        name="agenda"
        options={{ title: 'Agenda', tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} /> }}
      />
      <Tabs.Screen
        name="catalogos"
        options={{
          title: 'Catálogos',
          href: isTrabajador ? null : undefined,
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'file-tray-full' : 'file-tray-full-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Perfil', tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} /> }}
      />
    </Tabs>
  )
}
