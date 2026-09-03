import { useCallback, useState } from 'react'
import { View, Pressable, ScrollView, Image } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import Constants from 'expo-constants'
import { Text } from '@/components/Text'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/lib/session'
import { getEventosAgendaCached } from '@/lib/agenda-api'
import { getEstadoVisual, toDateInput } from '@/lib/agenda-view'
import type { EventoAgenda } from '@/lib/types'
import { colors } from '@/lib/colors'

export default function PerfilScreen() {
  const router = useRouter()
  const { session } = useSession()
  const email = session?.user.email ?? ''
  const esTrabajador = session?.user.app_metadata?.role === 'trabajador'

  const [eventosHoy, setEventosHoy] = useState<EventoAgenda[]>([])
  const [eventosHoyError, setEventosHoyError] = useState(false)
  useFocusEffect(
    useCallback(() => {
      const hoy = toDateInput(new Date())
      setEventosHoyError(false)
      // Cached: si ya se vio Agenda hoy, esto no repite el fetch de "hoy" a la red.
      getEventosAgendaCached(hoy, hoy)
        .then(setEventosHoy)
        .catch(() => setEventosHoyError(true))
    }, []),
  )
  const enCurso = eventosHoy.filter((ev) => getEstadoVisual(ev) === 'en_curso').length
  const pendientes = eventosHoy.filter((ev) => ['reserva', 'programado'].includes(getEstadoVisual(ev))).length

  return (
    <ScrollView className="flex-1 bg-igb-surface" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View className="bg-white border border-igb-outline rounded-lg p-4 mb-3 flex-row items-center gap-3">
        <Image
          source={require('../../../../assets/images/logo-isotype-master.png')}
          resizeMode="contain"
          // ponytail: RN Web no traduce w-14/h-14 a un tamaño real para
          // <Image> — sin esto, el ícono crecía a su tamaño nativo y le
          // robaba todo el ancho al email/stats de al lado (quedaban en
          // ancho 0, invisibles). El style explícito es necesario en las
          // tres plataformas para que el layout no dependa de esa laguna.
          style={{ width: 56, height: 56 }}
          className="rounded-xl"
        />
        <View className="flex-1">
          <Text className="text-igb-on-surface font-semibold" numberOfLines={1}>
            {email}
          </Text>
          {esTrabajador && (
            <View className="flex-row items-center gap-2 mt-1">
              <View className="bg-igb-yellow/15 px-2 py-0.5 rounded">
                <Text className="text-igb-yellow-dark text-[11px] font-semibold">Operario</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <View className="bg-white border border-igb-outline rounded-lg flex-row divide-x divide-igb-outline mb-3">
        <View className="flex-1 p-3 items-center">
          {/* "—" en vez de 0 si falló el fetch: 0 se leía como "sin servicios hoy",
              indistinguible de un error de red silencioso. */}
          <Text className="font-headline text-igb-navy text-xl">{eventosHoyError ? '—' : eventosHoy.length}</Text>
          <Text className="text-igb-secondary text-[11px] mt-1 text-center">Servicios hoy</Text>
        </View>
        <View className="flex-1 p-3 items-center">
          <Text className="font-headline text-igb-navy text-xl">{eventosHoyError ? '—' : enCurso}</Text>
          <Text className="text-igb-secondary text-[11px] mt-1 text-center">En curso</Text>
        </View>
        <View className="flex-1 p-3 items-center">
          <Text className="font-headline text-igb-navy text-xl">{eventosHoyError ? '—' : pendientes}</Text>
          <Text className="text-igb-secondary text-[11px] mt-1 text-center">Pendientes</Text>
        </View>
      </View>

      <Pressable
        onPress={() => router.push('/perfil/pair-tv')}
        className="bg-white border border-igb-outline rounded-lg p-4 mb-3 flex-row items-center"
      >
        <View className="w-9 h-9 rounded-lg bg-igb-navy/10 items-center justify-center mr-3">
          <Ionicons name="tv-outline" size={18} color={colors.navy} />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-igb-on-surface">Vincular TV</Text>
          <Text className="text-igb-secondary text-xs mt-0.5">Escaneá el QR de una TV para loguearla</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.secondary} />
      </Pressable>

      <Pressable
        onPress={() => supabase.auth.signOut()}
        className="bg-white border border-igb-error/30 rounded-lg py-3.5 mt-4 flex-row items-center justify-center gap-2"
      >
        <Ionicons name="log-out-outline" size={16} color={colors.error} />
        <Text className="text-igb-error font-medium text-center">Cerrar sesión</Text>
      </Pressable>

      <Text className="text-igb-secondary/60 text-[11px] text-center mt-6">
        Grúas InGlobal · v{Constants.expoConfig?.version ?? '1.0.0'}
      </Text>
    </ScrollView>
  )
}
