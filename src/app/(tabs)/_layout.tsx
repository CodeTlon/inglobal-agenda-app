import { Tabs } from 'expo-router'
import { Text } from 'react-native'

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#221b00',
        tabBarStyle: { backgroundColor: '#f5d100' },
      }}
    >
      <Tabs.Screen
        name="agenda"
        options={{ title: 'Agenda', tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} /> }}
      />
      <Tabs.Screen
        name="catalogos"
        options={{ title: 'Catálogos', tabBarIcon: ({ focused }) => <TabIcon emoji="🚚" focused={focused} /> }}
      />
      <Tabs.Screen
        name="clientes"
        options={{ title: 'Clientes', tabBarIcon: ({ focused }) => <TabIcon emoji="👥" focused={focused} /> }}
      />
      <Tabs.Screen
        name="servicios"
        options={{ title: 'Servicios', tabBarIcon: ({ focused }) => <TabIcon emoji="🔧" focused={focused} /> }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Perfil', tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} /> }}
      />
    </Tabs>
  )
}
