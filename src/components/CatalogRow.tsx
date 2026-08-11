import { View, Pressable, Switch, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/Text'
import type { ComponentProps } from 'react'

export function CatalogRow({
  icon,
  title,
  subtitle,
  activo,
  onToggle,
  onEdit,
  onDelete,
}: {
  icon: ComponentProps<typeof Ionicons>['name']
  title: string
  subtitle?: string | null
  activo: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <View className="flex-row items-center bg-white border border-igb-outline rounded-lg px-3 py-3 mb-2.5">
      <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${activo ? 'bg-igb-navy/10' : 'bg-igb-secondary/10'}`}>
        <Ionicons name={icon} size={20} color={activo ? '#1C357F' : '#575d78'} />
      </View>
      <Pressable onPress={onEdit} className="flex-1 mr-2">
        <Text className={`font-semibold ${activo ? 'text-igb-on-surface' : 'text-igb-secondary'}`} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-igb-secondary text-xs mt-0.5" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {!activo && <Text className="text-[10px] text-igb-secondary mt-0.5">Inactivo</Text>}
      </Pressable>
      <Switch value={activo} onValueChange={onToggle} trackColor={{ true: '#f5d100' }} style={{ transform: [{ scale: 0.85 }] }} />
      <Pressable
        hitSlop={8}
        className="ml-2 p-1.5"
        onPress={() =>
          Alert.alert('Eliminar', `¿Eliminar "${title}"?`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: onDelete },
          ])
        }
      >
        <Ionicons name="trash-outline" size={18} color="#dc2626" />
      </Pressable>
    </View>
  )
}
