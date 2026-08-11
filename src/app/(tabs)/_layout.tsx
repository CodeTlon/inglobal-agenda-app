import { Tabs } from 'expo-router'
import { useSession } from '@/lib/session'
import { TabBarIcon } from '@/components/TabBarIcon'

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
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e7e8e9',
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
          elevation: 8,
        },
      }}
    >
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon focused={focused} label="Agenda" name={focused ? 'calendar' : 'calendar-outline'} />
          ),
        }}
      />
      <Tabs.Screen
        name="catalogos"
        options={{
          title: 'Catálogos',
          href: isTrabajador ? null : undefined,
          tabBarIcon: ({ focused }) => (
            <TabBarIcon focused={focused} label="Catálogos" name={focused ? 'file-tray-full' : 'file-tray-full-outline'} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => (
            <TabBarIcon focused={focused} label="Perfil" name={focused ? 'person' : 'person-outline'} />
          ),
        }}
      />
    </Tabs>
  )
}
