import { View, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/Text'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/session'

export default function PerfilScreen() {
  const router = useRouter()
  const { session } = useSession()
  const email = session?.user.email ?? ''
  const iniciales = email.slice(0, 2).toUpperCase()
  const esTrabajador = session?.user.app_metadata?.role === 'trabajador'

  return (
    <View className="flex-1 bg-igb-surface p-4">
      <View className="bg-white border border-igb-outline rounded-lg p-4 mb-3 flex-row items-center gap-3">
        <View className="w-12 h-12 rounded-full bg-igb-navy/10 items-center justify-center">
          <Text className="font-headline text-igb-navy text-sm">{iniciales}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-igb-secondary text-xs">Sesión iniciada como</Text>
          <Text className="text-igb-on-surface font-semibold" numberOfLines={1}>
            {email}
          </Text>
          <Text className="text-igb-secondary text-xs mt-0.5">{esTrabajador ? 'Operario' : 'Despachador'}</Text>
        </View>
      </View>

      <Pressable
        onPress={() => router.push('/perfil/pair-tv')}
        className="bg-white border border-igb-outline rounded-lg p-4 mb-3 flex-row items-center"
      >
        <View className="w-9 h-9 rounded-lg bg-igb-navy/10 items-center justify-center mr-3">
          <Ionicons name="tv-outline" size={18} color="#1C357F" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-igb-on-surface">Vincular TV</Text>
          <Text className="text-igb-secondary text-xs mt-0.5">Escaneá el QR de una TV para loguearla</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#575d78" />
      </Pressable>

      <Pressable
        onPress={() => supabase.auth.signOut()}
        className="bg-white border border-red-200 rounded-lg py-3.5 mt-4 flex-row items-center justify-center gap-2"
      >
        <Ionicons name="log-out-outline" size={16} color="#dc2626" />
        <Text className="text-red-600 font-medium text-center">Cerrar sesión</Text>
      </Pressable>
    </View>
  )
}
