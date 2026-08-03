import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator, Pressable, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ClienteForm } from '@/components/ClienteForm'
import { getClienteById, deleteCliente } from '@/lib/clientes-api'
import { ApiError } from '@/lib/api'
import type { Cliente } from '@/lib/types'

export default function EditarClienteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getClienteById(id)
      .then(setCliente)
      .catch(() => setError('No se pudo cargar el cliente.'))
      .finally(() => setLoading(false))
  }, [id])

  function handleDelete() {
    Alert.alert('Eliminar cliente', '¿Seguro que querés eliminarlo? También se borran sus trabajos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCliente(id)
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
  if (error || !cliente) {
    return <View className="flex-1 items-center justify-center bg-igb-surface p-8"><Text className="text-red-600 text-center">{error ?? 'Cliente no encontrado.'}</Text></View>
  }

  return (
    <View className="flex-1">
      <ClienteForm initial={cliente} onDone={() => router.back()} />
      <Pressable onPress={handleDelete} className="absolute bottom-6 left-6">
        <Text className="text-red-600 font-medium">Eliminar cliente</Text>
      </Pressable>
    </View>
  )
}
