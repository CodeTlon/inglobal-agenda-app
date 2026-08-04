import { useState } from 'react'
import { View, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/Text'
import type { ComponentProps } from 'react'
import GruasScreen from '@/components/catalogos/GruasScreen'
import EmpresasScreen from '@/components/catalogos/EmpresasScreen'
import OperariosScreen from '@/components/catalogos/OperariosScreen'

const TABS = [
  { key: 'gruas', label: 'Grúas', icon: 'car-outline' },
  { key: 'empresas', label: 'Empresas', icon: 'business-outline' },
  { key: 'operarios', label: 'Operarios', icon: 'people-outline' },
] as const satisfies { key: string; label: string; icon: ComponentProps<typeof Ionicons>['name'] }[]

type TabKey = (typeof TABS)[number]['key']

export default function CatalogosScreen() {
  const [tab, setTab] = useState<TabKey>('gruas')

  return (
    <View className="flex-1 bg-igb-surface">
      <View className="flex-row bg-white border-b border-igb-outline px-2 pt-2">
        {TABS.map((t) => {
          const active = t.key === tab
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              className={`flex-1 flex-row items-center justify-center gap-1.5 pb-2.5 border-b-2 ${active ? 'border-igb-navy' : 'border-transparent'}`}
            >
              <Ionicons name={t.icon} size={16} color={active ? '#1C357F' : '#575d78'} />
              <Text className={`text-sm font-semibold ${active ? 'text-igb-navy' : 'text-igb-secondary'}`}>{t.label}</Text>
            </Pressable>
          )
        })}
      </View>
      {tab === 'gruas' && <GruasScreen />}
      {tab === 'empresas' && <EmpresasScreen />}
      {tab === 'operarios' && <OperariosScreen />}
    </View>
  )
}
