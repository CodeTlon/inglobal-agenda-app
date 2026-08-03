import { View, Text, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/session'

export default function PerfilScreen() {
  const router = useRouter()
  const { session } = useSession()

  return (
    <View className="flex-1 bg-igb-surface p-4">
      <View className="bg-white border border-igb-outline rounded-xl p-4 mb-3">
        <Text className="text-igb-secondary text-sm">Sesión iniciada como</Text>
        <Text className="text-igb-on-surface font-semibold">{session?.user.email}</Text>
      </View>

      <Pressable
        onPress={() => router.push('/perfil/pair-tv')}
        className="bg-white border border-igb-outline rounded-xl p-4 mb-3 flex-row items-center"
      >
        <Text className="text-2xl mr-3">📺</Text>
        <View className="flex-1">
          <Text className="text-lg font-semibold text-igb-on-surface">Vincular TV</Text>
          <Text className="text-igb-secondary text-sm">Escaneá el QR de una TV para loguearla</Text>
        </View>
      </Pressable>

      <Pressable
        onPress={() => supabase.auth.signOut()}
        className="bg-white border border-igb-outline rounded-xl p-4 mt-4"
      >
        <Text className="text-red-600 font-medium text-center">Cerrar sesión</Text>
      </Pressable>
    </View>
  )
}
