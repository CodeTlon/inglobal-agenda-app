import { useEffect, useState } from 'react'
import { View, ScrollView, Pressable, ActivityIndicator, Image } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Text } from '@/components/Text'
import { ErrorBanner } from '@/components/ErrorBanner'
import { getGruas, getEmpresasAgenda, getOperarios, getEventosDeRecurso, updateEmpresaAgenda } from '@/lib/agenda-api'
import { showApiError } from '@/lib/alert'
import { formatEstado, estadoColorClassesLight } from '@/lib/agenda-view'
import { supabase } from '@/lib/supabase'
import type { Grua, EmpresaAgenda, Operario, EventoAgenda } from '@/lib/types'

type Tipo = 'gruas' | 'empresas' | 'operarios'
type Recurso = Grua | EmpresaAgenda | Operario

const FETCH_CATALOGO: Record<Tipo, (includeInactive: boolean) => Promise<Recurso[]>> = {
  gruas: getGruas,
  empresas: getEmpresasAgenda,
  operarios: getOperarios,
}

// El logo se sube al bucket `media` que ya existe para el resto del sitio
// (ver inglobal-site/supabase/migrations/006_storage_media.sql) — nada de
// bucket ni políticas nuevas, solo un prefijo de carpeta propio.
async function subirLogo(empresaId: string, uri: string): Promise<string> {
  const res = await fetch(uri)
  const buffer = await res.arrayBuffer()
  const esPng = uri.toLowerCase().endsWith('.png')
  const path = `empresa-logos/${empresaId}.${esPng ? 'png' : 'jpg'}`
  const { error } = await supabase.storage.from('media').upload(path, buffer, {
    contentType: esPng ? 'image/png' : 'image/jpeg',
    upsert: true,
  })
  if (error) throw error
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}

function contraparte(tipo: Tipo, ev: EventoAgenda): string {
  const grua = ev.grua?.nombre ?? 'Grúa eliminada'
  const empresa = ev.empresa?.nombre ?? 'Empresa eliminada'
  const operarios = ev.operarios.map((o) => o.nombre)
  if (tipo === 'gruas') return [empresa, ...operarios].join(' · ')
  if (tipo === 'empresas') return [grua, ...operarios].join(' · ')
  return [grua, empresa].join(' · ')
}

export default function RecursoDetalleScreen() {
  const { tipo, id } = useLocalSearchParams<{ tipo: Tipo; id: string }>()
  const [recurso, setRecurso] = useState<Recurso | null>(null)
  const [eventos, setEventos] = useState<EventoAgenda[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  function load() {
    setLoading(true)
    setError(null)
    Promise.all([FETCH_CATALOGO[tipo](true), getEventosDeRecurso(tipo, id)])
      .then(([lista, evs]) => {
        setRecurso(lista.find((r) => r.id === id) ?? null)
        setEventos(evs)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar el detalle.'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [tipo, id])

  async function handleElegirLogo() {
    if (tipo !== 'empresas' || !recurso) return
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permiso.granted) return
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 })
    if (result.canceled) return
    setUploading(true)
    try {
      const logo_url = await subirLogo(id, result.assets[0].uri)
      const empresa = recurso as EmpresaAgenda
      await updateEmpresaAgenda(id, {
        nombre: empresa.nombre,
        contacto: empresa.contacto ?? '',
        telefono: empresa.telefono ?? '',
        notas: empresa.notas,
        logo_url,
      })
      load()
    } catch (e) {
      showApiError(e, 'No se pudo subir el logo.', 'No se pudo subir el logo')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#f5d100" />
      </View>
    )
  }
  if (error) {
    return (
      <View className="flex-1 items-center px-4 pt-8">
        <ErrorBanner message={error} />
      </View>
    )
  }
  if (!recurso) {
    return (
      <View className="flex-1 items-center px-4 pt-8">
        <Text className="text-igb-secondary">No se encontró.</Text>
      </View>
    )
  }

  const contadores = eventos.reduce<Record<string, number>>((acc, ev) => {
    acc[ev.estado] = (acc[ev.estado] ?? 0) + 1
    return acc
  }, {})

  return (
    <ScrollView className="flex-1 bg-igb-surface px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="bg-white border border-igb-outline rounded-lg p-4 mb-4">
        {tipo === 'empresas' && (
          <Pressable onPress={handleElegirLogo} disabled={uploading} className="items-center mb-3">
            {(recurso as EmpresaAgenda).logo_url ? (
              <Image source={{ uri: (recurso as EmpresaAgenda).logo_url! }} className="w-20 h-20 rounded-full mb-1" />
            ) : (
              <View className="w-20 h-20 rounded-full bg-igb-navy/10 items-center justify-center mb-1">
                <Text className="text-igb-secondary text-xs">Sin logo</Text>
              </View>
            )}
            <Text className="text-igb-navy text-xs font-medium">{uploading ? 'Subiendo…' : 'Cambiar logo'}</Text>
          </Pressable>
        )}
        <Text className="font-headline text-xl text-igb-on-surface">{recurso.nombre}</Text>
        {!recurso.activo && <Text className="text-igb-secondary text-xs mt-1">Inactivo</Text>}
        {tipo === 'gruas' && (
          <Text className="text-igb-secondary text-sm mt-1">
            {(recurso as Grua).tipo} · {(recurso as Grua).patente ?? 'sin patente'} · {(recurso as Grua).capacidad_toneladas ?? '?'}t
          </Text>
        )}
        {tipo === 'empresas' && (
          <Text className="text-igb-secondary text-sm mt-1">
            {(recurso as EmpresaAgenda).contacto} · {(recurso as EmpresaAgenda).telefono}
          </Text>
        )}
        {tipo === 'operarios' && (recurso as Operario).telefono && (
          <Text className="text-igb-secondary text-sm mt-1">{(recurso as Operario).telefono}</Text>
        )}
      </View>

      <View className="flex-row flex-wrap gap-2 mb-4">
        <StatTile label="Total" value={eventos.length} />
        <StatTile label="Finalizados" value={contadores.finalizado ?? 0} />
        <StatTile label="Cancelados" value={contadores.cancelado ?? 0} />
        <StatTile label="En curso" value={contadores.en_curso ?? 0} />
        <StatTile label="Programados" value={contadores.programado ?? 0} />
        <StatTile label="Reservados" value={contadores.reserva ?? 0} />
      </View>

      <Text className="text-igb-secondary text-xs font-semibold uppercase mb-2">Historial de eventos</Text>
      {eventos.length === 0 && (
        <Text className="text-igb-secondary text-sm">Todavía no tiene eventos asociados.</Text>
      )}
      {[...eventos].reverse().map((ev) => (
        <View key={ev.id} className="bg-white border border-igb-outline rounded-lg p-3 mb-2">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-igb-on-surface font-medium">
              {new Date(`${ev.fecha}T00:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
            <View className={`px-1.5 py-0.5 rounded border ${estadoColorClassesLight(ev.estado)}`}>
              <Text className="text-[10px] font-semibold">{formatEstado(ev.estado)}</Text>
            </View>
          </View>
          <Text className="text-igb-secondary text-xs">
            {ev.hora_inicio.slice(0, 5)}{ev.hora_fin ? ` – ${ev.hora_fin.slice(0, 5)}` : ''}
          </Text>
          <Text className="text-igb-secondary text-xs mt-0.5" numberOfLines={1}>
            {contraparte(tipo, ev)}
          </Text>
        </View>
      ))}
    </ScrollView>
  )
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <View className="bg-white border border-igb-outline rounded-lg px-3 py-2 items-center" style={{ minWidth: 84 }}>
      <Text className="text-igb-on-surface font-headline text-lg">{value}</Text>
      <Text className="text-igb-secondary text-[10px]">{label}</Text>
    </View>
  )
}
