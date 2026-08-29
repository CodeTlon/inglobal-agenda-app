import { useEffect, useState } from 'react'
import { View, ScrollView, Pressable, ActivityIndicator, Image, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Picker } from '@react-native-picker/picker'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { Text } from '@/components/Text'
import { TextInput } from '@/components/TextInput'
import { ErrorBanner } from '@/components/ErrorBanner'
import {
  getGruas,
  getEmpresasAgenda,
  getOperarios,
  getEventosDeRecurso,
  updateGrua,
  updateOperario,
  updateEmpresaAgenda,
  deleteGrua,
  deleteOperario,
  deleteEmpresaAgenda,
} from '@/lib/agenda-api'
import { showApiError } from '@/lib/alert'
import { formatEstado, estadoColorClassesLight } from '@/lib/agenda-view'
import { supabase } from '@/lib/supabase'
import { TIPOS_GRUA } from '@/lib/types'
import type { Grua, EmpresaAgenda, Operario, EventoAgenda } from '@/lib/types'

type Tipo = 'gruas' | 'empresas' | 'operarios'
type Recurso = Grua | EmpresaAgenda | Operario

const FETCH_CATALOGO: Record<Tipo, (includeInactive: boolean) => Promise<Recurso[]>> = {
  gruas: getGruas,
  empresas: getEmpresasAgenda,
  operarios: getOperarios,
}
const ICONO: Record<Tipo, 'car-outline' | 'business-outline' | 'people-outline'> = {
  gruas: 'car-outline',
  empresas: 'business-outline',
  operarios: 'people-outline',
}
const NOMBRE_TIPO: Record<Tipo, string> = { gruas: 'grúa', empresas: 'empresa', operarios: 'operario' }

// La foto/logo se sube al bucket `media` que ya existe para el resto del
// sitio (ver inglobal-site/supabase/migrations/006_storage_media.sql) —
// nada de bucket ni políticas nuevas, solo una carpeta propia por tipo.
async function subirFoto(carpeta: string, id: string, uri: string): Promise<string> {
  const res = await fetch(uri)
  const buffer = await res.arrayBuffer()
  const esPng = uri.toLowerCase().endsWith('.png')
  const path = `${carpeta}/${id}.${esPng ? 'png' : 'jpg'}`
  const { error } = await supabase.storage.from('media').upload(path, buffer, {
    contentType: esPng ? 'image/png' : 'image/jpeg',
    upsert: true,
  })
  if (error) throw error
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}

function fotoDe(tipo: Tipo, recurso: Recurso): string | null {
  return tipo === 'empresas' ? (recurso as EmpresaAgenda).logo_url : (recurso as Grua | Operario).foto_url
}

// Payload completo por tipo — las tres APIs son PATCH de objeto entero, no
// parcial, así que hay que mandar todos los campos aunque solo haya
// cambiado la foto.
async function guardarRecurso(tipo: Tipo, id: string, recurso: Recurso, fotoUrl: string): Promise<void> {
  if (tipo === 'gruas') {
    const g = recurso as Grua
    await updateGrua(id, { nombre: g.nombre, patente: g.patente ?? '', capacidad_toneladas: g.capacidad_toneladas ?? 0, tipo: g.tipo, foto_url: fotoUrl })
  } else if (tipo === 'operarios') {
    const o = recurso as Operario
    await updateOperario(id, { nombre: o.nombre, telefono: o.telefono ?? '', foto_url: fotoUrl })
  } else {
    const e = recurso as EmpresaAgenda
    await updateEmpresaAgenda(id, { nombre: e.nombre, contacto: e.contacto ?? '', telefono: e.telefono ?? '', notas: e.notas, logo_url: fotoUrl })
  }
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
  const router = useRouter()
  const { tipo, id } = useLocalSearchParams<{ tipo: Tipo; id: string }>()
  const [recurso, setRecurso] = useState<Recurso | null>(null)
  const [eventos, setEventos] = useState<EventoAgenda[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

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

  async function handleElegirFoto() {
    if (!recurso) return
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permiso.granted) return
    // allowsEditing abre el editor nativo del OS (iOS/Android) para
    // recortar/centrar antes de confirmar — el "estándar" de subir foto,
    // sin reinventar una UI de recorte a mano en RN.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    })
    if (result.canceled) return
    setUploading(true)
    try {
      const carpeta = tipo === 'gruas' ? 'grua-fotos' : tipo === 'operarios' ? 'operario-fotos' : 'empresa-logos'
      const url = await subirFoto(carpeta, id, result.assets[0].uri)
      await guardarRecurso(tipo, id, recurso, url)
      load()
    } catch (e) {
      showApiError(e, 'No se pudo subir la foto.', 'No se pudo subir la foto')
    } finally {
      setUploading(false)
    }
  }

  function openEdit() {
    if (!recurso) return
    if (tipo === 'gruas') {
      const g = recurso as Grua
      setForm({ nombre: g.nombre, patente: g.patente ?? '', capacidad_toneladas: String(g.capacidad_toneladas ?? ''), tipo: g.tipo })
    } else if (tipo === 'operarios') {
      const o = recurso as Operario
      setForm({ nombre: o.nombre, telefono: o.telefono ?? '' })
    } else {
      const e = recurso as EmpresaAgenda
      setForm({ nombre: e.nombre, contacto: e.contacto ?? '', telefono: e.telefono ?? '', notas: e.notas ?? '' })
    }
    setFormError(null)
    setEditing(true)
  }

  async function handleSave() {
    if (!recurso) return
    if (!form.nombre?.trim()) {
      setFormError('El nombre es obligatorio.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      if (tipo === 'gruas') {
        if (!form.patente?.trim()) throw new Error('La patente es obligatoria.')
        const capacidad = Number(form.capacidad_toneladas)
        if (!Number.isFinite(capacidad) || capacidad <= 0) throw new Error('La capacidad debe ser un número mayor a 0.')
        await updateGrua(id, { nombre: form.nombre, patente: form.patente, capacidad_toneladas: capacidad, tipo: form.tipo, foto_url: (recurso as Grua).foto_url })
      } else if (tipo === 'operarios') {
        if (!form.telefono?.trim()) throw new Error('El teléfono es obligatorio.')
        if (!/^[\d\s()+-]+$/.test(form.telefono)) throw new Error('El teléfono tiene caracteres inválidos.')
        await updateOperario(id, { nombre: form.nombre, telefono: form.telefono, foto_url: (recurso as Operario).foto_url })
      } else {
        if (!form.contacto?.trim()) throw new Error('El contacto es obligatorio.')
        if (!form.telefono?.trim()) throw new Error('El teléfono es obligatorio.')
        if (!/^[\d\s()+-]+$/.test(form.telefono)) throw new Error('El teléfono tiene caracteres inválidos.')
        await updateEmpresaAgenda(id, { nombre: form.nombre, contacto: form.contacto, telefono: form.telefono, notas: form.notas || null, logo_url: (recurso as EmpresaAgenda).logo_url })
      }
      setEditing(false)
      load()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  function handleDelete() {
    if (!recurso) return
    const nombreTipo = NOMBRE_TIPO[tipo]
    if (recurso.activo) {
      Alert.alert('Desactivá primero', `Para eliminar esta ${nombreTipo} primero desactivala.`)
      return
    }
    Alert.alert('Eliminar', `¿Eliminar "${recurso.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            if (tipo === 'gruas') await deleteGrua(id)
            else if (tipo === 'operarios') await deleteOperario(id)
            else await deleteEmpresaAgenda(id)
            router.back()
          } catch (e) {
            showApiError(e, 'No se pudo eliminar.', `No se pudo eliminar la ${nombreTipo}`)
          }
        },
      },
    ])
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
  const foto = fotoDe(tipo, recurso)

  return (
    <ScrollView className="flex-1 bg-igb-surface px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="bg-white border border-igb-outline rounded-lg p-4 mb-4">
        <Pressable onPress={handleElegirFoto} disabled={uploading} className="items-center mb-3">
          {foto ? (
            <Image source={{ uri: foto }} className="w-20 h-20 rounded-full mb-1" />
          ) : (
            <View className="w-20 h-20 rounded-full bg-igb-navy/10 items-center justify-center mb-1">
              <Ionicons name={ICONO[tipo]} size={32} color="#1C357F" />
            </View>
          )}
          <Text className="text-igb-navy text-xs font-medium">{uploading ? 'Subiendo…' : foto ? 'Cambiar foto' : 'Agregar foto'}</Text>
        </Pressable>

        {editing ? (
          <View>
            <Field
              label="Nombre"
              value={form.nombre}
              onChange={(v) => setForm((f) => ({ ...f, nombre: v }))}
              placeholder={tipo === 'gruas' ? 'Ej: Grúa 1' : tipo === 'operarios' ? 'Ej: Carlos Gómez' : 'Ej: Constructora del Sur S.A.'}
            />
            {tipo === 'gruas' && (
              <>
                <Field label="Patente" value={form.patente} onChange={(v) => setForm((f) => ({ ...f, patente: v }))} placeholder="AB123CD" autoCapitalize="characters" />
                <Field label="Capacidad (toneladas)" value={form.capacidad_toneladas} onChange={(v) => setForm((f) => ({ ...f, capacidad_toneladas: v }))} placeholder="10" keyboardType="numeric" />
                <Text className="text-igb-on-surface mb-1 font-medium">Tipo</Text>
                <View className="border border-igb-outline rounded-lg bg-white mb-3">
                  <Picker selectedValue={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
                    {TIPOS_GRUA.map((t) => <Picker.Item key={t} label={t} value={t} />)}
                  </Picker>
                </View>
              </>
            )}
            {tipo === 'operarios' && (
              <Field label="Teléfono" value={form.telefono} onChange={(v) => setForm((f) => ({ ...f, telefono: v }))} placeholder="011 1234-5678" keyboardType="phone-pad" />
            )}
            {tipo === 'empresas' && (
              <>
                <Field label="Contacto" value={form.contacto} onChange={(v) => setForm((f) => ({ ...f, contacto: v }))} placeholder="Ej: Juan Pérez" />
                <Field label="Teléfono" value={form.telefono} onChange={(v) => setForm((f) => ({ ...f, telefono: v }))} placeholder="011 1234-5678" keyboardType="phone-pad" />
                <Field label="Notas" value={form.notas} onChange={(v) => setForm((f) => ({ ...f, notas: v }))} placeholder="Notas internas (opcional)" />
              </>
            )}
            {formError && <ErrorBanner message={formError} />}
            <View className="flex-row gap-2 mt-1">
              <Pressable onPress={handleSave} disabled={saving} className="flex-1 bg-igb-yellow rounded-lg py-3 items-center disabled:opacity-60">
                {saving ? <ActivityIndicator color="#221b00" /> : <Text className="text-igb-on-yellow font-bold">Guardar</Text>}
              </Pressable>
              <Pressable onPress={() => setEditing(false)} className="flex-1 border border-igb-outline rounded-lg py-3 items-center">
                <Text className="text-igb-secondary">Cancelar</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View>
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
            <View className="flex-row gap-2 mt-3">
              <Pressable onPress={openEdit} className="flex-1 border border-igb-navy/30 rounded-lg py-2.5 items-center">
                <Text className="text-igb-navy font-medium">Editar</Text>
              </Pressable>
              <Pressable onPress={handleDelete} className="flex-1 border border-igb-error/30 rounded-lg py-2.5 items-center">
                <Text className="text-igb-error font-medium">Eliminar</Text>
              </Pressable>
            </View>
          </View>
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

function Field({
  label,
  value,
  onChange,
  placeholder,
  autoCapitalize,
  keyboardType,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoCapitalize?: 'characters' | 'none'
  keyboardType?: 'numeric' | 'phone-pad'
}) {
  return (
    <>
      <Text className="text-igb-on-surface mb-1 font-medium">{label}</Text>
      <TextInput
        value={value ?? ''}
        onChangeText={onChange}
        placeholder={placeholder}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        className="border border-igb-outline rounded-lg px-4 py-3 mb-3 bg-white text-igb-on-surface"
      />
    </>
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
