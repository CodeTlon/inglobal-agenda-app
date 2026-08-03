import { useCallback, useState } from 'react'
import { View, Text, Image, ScrollView, Pressable, ActivityIndicator } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { getServicios } from '@/lib/servicios-api'
import type { Servicio } from '@/lib/types'

export default function ServiciosScreen() {
  const router = useRouter()
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      getServicios().then(setServicios).finally(() => setLoading(false))
    }, []),
  )

  return (
    <View className="flex-1 bg-igb-surface">
      {loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#f5d100" /></View>
      ) : (
        <ScrollView className="flex-1 px-4 pt-4">
          {servicios.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => router.push(`/servicios/${s.id}`)}
              className="bg-white border border-igb-outline rounded-xl p-3 mb-3 flex-row items-center"
            >
              <Image source={{ uri: s.img }} className="w-12 h-12 rounded-lg mr-3" resizeMode="cover" />
              <View className="flex-1">
                <Text className={`font-semibold ${s.published ? 'text-igb-on-surface' : 'text-igb-secondary'}`}>{s.title}</Text>
                <Text className="text-igb-secondary text-xs">{s.published ? 'Publicado' : 'Borrador'}</Text>
              </View>
            </Pressable>
          ))}
          <View className="h-24" />
        </ScrollView>
      )}
      <Pressable onPress={() => router.push('/servicios/nuevo')} className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-igb-yellow items-center justify-center shadow-lg">
        <Text className="text-2xl text-igb-on-yellow">+</Text>
      </Pressable>
    </View>
  )
}
