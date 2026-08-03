import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, Pressable, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ServicioForm } from '@/components/ServicioForm'
import { getServicioById, deleteServicio } from '@/lib/servicios-api'
import { ApiError } from '@/lib/api'
import type { Servicio } from '@/lib/types'

export default function EditarServicioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [servicio, setServicio] = useState<Servicio | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getServicioById(id)
      .then(setServicio)
      .catch(() => setError('No se pudo cargar el servicio.'))
      .finally(() => setLoading(false))
  }, [id])

  function handleDelete() {
    Alert.alert('Eliminar servicio', '¿Seguro que querés eliminarlo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteServicio(id)
            router.back()
          } catch (e) {
            Alert.alert('Error', e instanceof ApiError ? e.message : 'No se pudo eliminar.')
          }
        },
      },
    ])
  }

  if (loading) {
    return <View className="flex-1 items-center justify-center bg-igb-surface"><ActivityIndicator color="#f5d100" /></View>
  }
  if (error || !servicio) {
    return <View className="flex-1 items-center justify-center bg-igb-surface p-8"><Text className="text-red-600 text-center">{error ?? 'Servicio no encontrado.'}</Text></View>
  }

  return (
    <View className="flex-1">
      <ServicioForm initial={servicio} onDone={() => router.back()} />
      <Pressable onPress={handleDelete} className="absolute bottom-6 left-6">
        <Text className="text-red-600 font-medium">Eliminar servicio</Text>
      </Pressable>
    </View>
  )
}
