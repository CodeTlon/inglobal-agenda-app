import { View, Text, Pressable, Switch, Alert } from 'react-native'

export function CatalogRow({
  title,
  subtitle,
  activo,
  onToggle,
  onEdit,
  onDelete,
}: {
  title: string
  subtitle?: string | null
  activo: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <View className="bg-white border border-igb-outline rounded-xl p-4 mb-3">
      <Pressable onPress={onEdit}>
        <Text className={`font-semibold ${activo ? 'text-igb-on-surface' : 'text-igb-secondary'}`}>{title}</Text>
        {subtitle ? <Text className="text-igb-secondary text-sm mt-0.5">{subtitle}</Text> : null}
      </Pressable>
      <View className="flex-row items-center justify-between mt-3">
        <View className="flex-row items-center">
          <Text className="text-sm text-igb-secondary mr-2">{activo ? 'Activo' : 'Inactivo'}</Text>
          <Switch value={activo} onValueChange={onToggle} trackColor={{ true: '#f5d100' }} />
        </View>
        <Pressable
          onPress={() =>
            Alert.alert('Eliminar', `¿Eliminar "${title}"?`, [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Eliminar', style: 'destructive', onPress: onDelete },
            ])
          }
        >
          <Text className="text-red-600 text-sm font-medium">Eliminar</Text>
        </Pressable>
      </View>
    </View>
  )
}
