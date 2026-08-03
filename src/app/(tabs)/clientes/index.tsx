import { useCallback, useState } from 'react'
import { View, Text, Image, ScrollView, Pressable, ActivityIndicator } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { getClientes } from '@/lib/clientes-api'
import type { Cliente } from '@/lib/types'

export default function ClientesScreen() {
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      getClientes().then(setClientes).finally(() => setLoading(false))
    }, []),
  )

  return (
    <View className="flex-1 bg-igb-surface">
      {loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#f5d100" /></View>
      ) : (
        <ScrollView className="flex-1 px-4 pt-4">
          {clientes.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => router.push(`/clientes/${c.id}`)}
              className="bg-white border border-igb-outline rounded-xl p-3 mb-3 flex-row items-center"
            >
              <Image source={{ uri: c.logo }} className="w-12 h-12 rounded-lg mr-3" resizeMode="contain" />
              <View className="flex-1">
                <Text className={`font-semibold ${c.published ? 'text-igb-on-surface' : 'text-igb-secondary'}`}>{c.name}</Text>
                <Text className="text-igb-secondary text-xs">
                  {c.published ? 'Publicado' : 'Borrador'}{c.featured ? ' — Destacado' : ''}
                </Text>
              </View>
            </Pressable>
          ))}
          <View className="h-24" />
        </ScrollView>
      )}
      <Pressable onPress={() => router.push('/clientes/nuevo')} className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-igb-yellow items-center justify-center shadow-lg">
        <Text className="text-2xl text-igb-on-yellow">+</Text>
      </Pressable>
    </View>
  )
}
