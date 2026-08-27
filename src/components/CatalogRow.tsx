import { View, Pressable, Switch, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/Text'
import type { ComponentProps } from 'react'

// Disponible/Ocupado se derivan en cada pantalla cruzando los eventos de hoy
// (ver OperariosScreen/GruasScreen) — no hay campo de turno/estado en el
// catálogo en sí, por eso solo existen estos dos valores (nada de "fuera de
// turno", no hay data real detrás de eso).
export type CatalogEstado = { kind: 'disponible' | 'ocupado'; detail?: string }

export function CatalogRow({
  icon,
  title,
  subtitle,
  activo,
  estado,
  onToggle,
  onEdit,
  onDelete,
}: {
  icon: ComponentProps<typeof Ionicons>['name']
  title: string
  subtitle?: string | null
  activo: boolean
  estado?: CatalogEstado
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
        <View className="flex-row items-center gap-1.5">
          <Text className={`font-semibold ${activo ? 'text-igb-on-surface' : 'text-igb-secondary'}`} numberOfLines={1}>
            {title}
          </Text>
          {estado && (
            <View className={`px-1.5 py-0.5 rounded ${estado.kind === 'ocupado' ? 'bg-igb-error/10' : 'bg-igb-success/10'}`}>
              <Text className={`text-[9px] font-semibold ${estado.kind === 'ocupado' ? 'text-igb-error' : 'text-igb-success'}`}>
                {estado.kind === 'ocupado' ? 'Ocupado' : 'Disponible'}
              </Text>
            </View>
          )}
        </View>
        {subtitle ? (
          <Text className="text-igb-secondary text-xs mt-0.5" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {estado?.kind === 'ocupado' && estado.detail ? (
          <Text className="text-igb-error text-[11px] font-medium mt-0.5" numberOfLines={1}>
            {estado.detail}
          </Text>
        ) : null}
        {!activo && <Text className="text-[10px] text-igb-secondary mt-0.5">Inactivo</Text>}
      </Pressable>
      <Switch value={activo} onValueChange={onToggle} trackColor={{ true: '#f5d100' }} style={{ transform: [{ scale: 0.85 }] }} />
      <Pressable
        hitSlop={8}
        className="ml-2 p-1.5"
        onPress={() =>
          // El backend ya bloquea (409, catalogDelete en inglobal-site/lib/agenda-business.ts)
          // eliminar una grúa/empresa con eventos asociados, con un mensaje
          // específico ("tiene N evento(s) asociado(s). Desactivalo en vez de
          // eliminarlo") que showApiError muestra tal cual — verificado contra
          // el backend real. Para operarios el borrado es intencionalmente
          // libre (relación M2M con CASCADE, decisión de negocio: "borrar un
          // operario siempre debe funcionar"), así que no hay nada que advertir
          // de más acá — el aviso genérico alcanza, no hace falta duplicar ni
          // adivinar lo que ya resuelve el servidor.
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
