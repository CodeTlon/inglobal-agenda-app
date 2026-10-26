import { useCallback, useState } from 'react'
import { Tabs } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TabBarIcon } from '@/components/TabBarIcon'
import { VeloCarga } from '@/components/PantallaCarga'

export default function TabsLayout() {
  const insets = useSafeAreaInsets()
  // Velo de carga al cambiar de sección: se muestra mientras las fotos de los catálogos se bajan al caché.
  const [velo, setVelo] = useState(false)
  const cerrarVelo = useCallback(() => setVelo(false), [])

  return (
    <>
    {/* Todas las pantallas de este grupo usan NavHeader con fondo navy hasta
        el notch — iconos claros del status bar, a diferencia del "dark"
        global de _layout.tsx (pensado para login/loading, de fondo claro). */}
    <StatusBar style="light" />
    <Tabs
      screenListeners={({ navigation }) => ({
        tabPress: () => {
          if (!navigation.isFocused()) setVelo(true)
        },
      })}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        // TabBarIcon dibuja ícono + label apilados (no el label nativo del
        // tab bar, deshabilitado arriba) — un tabBarStyle custom sin height
        // ni paddingBottom explícitos no reserva alto para eso ni para el
        // inset inferior (barra de gestos de Android), y el contenido queda
        // cortado contra el borde de la pantalla.
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e7e8e9',
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
          elevation: 8,
          height: 56 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom,
        },
        // Sin esto, react-navigation le da al slot de tabBarIcon un ancho
        // angosto pensado para un ícono solo (~7px medidos) — con label
        // apilado adentro (tabBarShowLabel va en false, el label vive en
        // TabBarIcon) el texto quedaba envuelto letra por letra, invisible.
        tabBarIconStyle: { width: 96, height: 48 },
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
    {velo && <VeloCarga abajo={56 + insets.bottom} onFin={cerrarVelo} />}
    </>
  )
}
