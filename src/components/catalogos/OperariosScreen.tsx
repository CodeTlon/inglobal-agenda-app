import { useCallback, useEffect, useMemo, useState } from 'react'
import { View, ScrollView, Pressable, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native'
import { Image } from 'expo-image'
import { cssInterop } from 'nativewind'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/Text'
import { TextInput } from '@/components/TextInput'
import { ErrorBanner } from '@/components/ErrorBanner'
import { getOperarios, getOperariosEliminados, createOperario, updateOperario, toggleOperario, reincorporarOperario, eliminarOperarioDefinitivo } from '@/lib/agenda-api'
import { ApiError } from '@/lib/api'
import { showApiError } from '@/lib/alert'
import { confirmDialog } from '@/components/Dialog'
import { useOcupacionDelDia, ordenarCatalogo } from '@/lib/catalog-ocupacion'
import { subirFoto, elegirFotoDeGaleria } from '@/lib/media-upload'
import { ROLES_OPERARIO } from '@/lib/types'
import type { Operario, EventoAgenda, RolOperario } from '@/lib/types'
import { CatalogRow } from '@/components/CatalogRow'
import { colors } from '@/lib/colors'

// Ver CatalogRow.tsx: mismo motivo (cache a disco, className vía cssInterop).
cssInterop(Image, { className: 'style' })

const EMPTY = { nombre: '', telefono: '' }

const VISTAS = [
  { key: 'activos', label: 'Operarios' },
  { key: 'ex', label: 'Ex operarios' },
] as const

export default function OperariosScreen() {
  const router = useRouter()
  const matcher = useCallback((ev: EventoAgenda, o: Operario) => ev.operarios.some((op) => op.id === o.id), [])
  const { items: operarios, loading, loadError, load, estadoDe } = useOcupacionDelDia(
    getOperarios,
    matcher,
    'No se pudieron cargar los operarios.',
  )
  const [showForm, setShowForm] = useState(false)
  const operariosOrdenados = useMemo(() => ordenarCatalogo(operarios, estadoDe), [operarios, estadoDe])
  const operariosActivos = useMemo(() => operariosOrdenados.filter((o) => o.activo), [operariosOrdenados])
  const operariosInactivos = useMemo(() => operariosOrdenados.filter((o) => !o.activo), [operariosOrdenados])
  const [form, setForm] = useState(EMPTY)
  const [roles, setRoles] = useState<RolOperario[]>([])
  const [vista, setVista] = useState<'activos' | 'ex'>('activos')
  const [exOperarios, setExOperarios] = useState<Operario[]>([])
  const [exError, setExError] = useState<string | null>(null)

  const cargarEx = useCallback(() => {
    return getOperariosEliminados()
      .then((lista) => {
        // Defensa ante un backend viejo que ignora ?eliminados=true y devuelve
        // todos: un ex operario siempre tiene eliminado_at.
        setExOperarios(lista.filter((o) => o.eliminado_at))
        setExError(null)
      })
      .catch(() => setExError('No se pudieron cargar los ex operarios.'))
  }, [])

  useEffect(() => {
    if (vista === 'ex') cargarEx()
  }, [vista, cargarEx])

  // Salida de emergencia para errores de carga: el backend solo lo permite si el
  // ex operario no tiene eventos; si los tiene, responde con el motivo.
  function handleEliminarDefinitivo(o: Operario) {
    confirmDialog('Eliminar definitivamente', `¿Eliminar a "${o.nombre}" para siempre? No se puede deshacer. Solo se puede si no tiene eventos en el historial.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await eliminarOperarioDefinitivo(o.id)
            await cargarEx()
          } catch (err) {
            showApiError(err, 'No se pudo eliminar.', 'No se pudo eliminar al operario')
          }
        },
      },
    ])
  }

  function handleReincorporar(o: Operario) {
    confirmDialog('Reincorporar', `¿Reincorporar a "${o.nombre}"? Vuelve a Operarios como inactivo; activalo con el interruptor.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Reincorporar',
        onPress: async () => {
          try {
            await reincorporarOperario(o.id)
            await cargarEx()
            load()
          } catch (err) {
            showApiError(err, 'No se pudo reincorporar.', 'No se pudo reincorporar al operario')
          }
        },
      },
    ])
  }
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fotoUri, setFotoUri] = useState<string | null>(null)

  // Editar un operario existente vive en su pantalla de detalle, no acá —
  // este form solo se usa para dar de alta uno nuevo.
  function openNew() {
    setForm(EMPTY)
    setRoles([])
    setFotoUri(null)
    setError(null)
    setShowForm(true)
  }

  async function handleElegirFoto() {
    const uri = await elegirFotoDeGaleria()
    if (uri) setFotoUri(uri)
  }

  function validate(): string | null {
    if (!form.nombre.trim()) return 'El nombre es obligatorio.'
    // El teléfono es opcional; el formato solo se valida si se cargó.
    if (!form.telefono.trim()) return null
    // Mismo formato que valida el backend (operarioSchema en
    // inglobal-site/lib/validations/agenda.ts) — atajarlo acá evita el
    // viaje al servidor solo para enterarse de que el formato es inválido.
    if (!/^[\d\s()+-]+$/.test(form.telefono)) return 'El teléfono tiene caracteres inválidos.'
    // El regex de arriba solo filtra caracteres — "1" o "-" solos lo pasaban.
    if (form.telefono.replace(/\D/g, '').length < 6) return 'El teléfono parece incompleto.'
    return null
  }

  async function handleSave() {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const id = (await createOperario({ nombre: form.nombre, telefono: form.telefono.trim() || null, roles })).id
      // El operario ya quedó creado acá — lo que pase con la foto de ahora
      // en más no debe tapar eso ni bloquear el alta.
      setShowForm(false)
      load()
      if (fotoUri) {
        try {
          const foto_url = await subirFoto('operario-fotos', id, fotoUri)
          await updateOperario(id, { nombre: form.nombre, telefono: form.telefono.trim() || null, roles, foto_url })
          load()
        } catch (e) {
          confirmDialog('Guardado sin foto', e instanceof ApiError ? e.message : 'El operario se creó, pero no se pudo subir la foto por un problema de conexión. Podés agregarla después editando.')
        }
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(o: Operario) {
    try {
      // Mismo bug preexistente que Grúas — ver ese comentario. El backend
      // espera el valor ACTUAL, no el ya negado.
      await toggleOperario(o.id, o.activo)
      load()
    } catch (err) {
      showApiError(err, 'No se pudo actualizar.', 'No se pudo actualizar el operario')
    }
  }

  if (showForm) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
      <ScrollView className="flex-1 bg-igb-surface px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <Pressable onPress={handleElegirFoto} className="items-center mb-4">
          {fotoUri ? (
            <Image source={{ uri: fotoUri }} contentFit="cover" cachePolicy="disk" className="w-20 h-20 rounded-full mb-1" />
          ) : (
            <View className="w-20 h-20 rounded-full bg-igb-navy/10 items-center justify-center mb-1">
              <Ionicons name="people-outline" size={32} color={colors.navy} />
            </View>
          )}
          <Text className="text-igb-navy text-xs font-medium">{fotoUri ? 'Cambiar foto' : 'Agregar foto'}</Text>
        </Pressable>

        <Text className="text-igb-on-surface mb-1 font-medium">Nombre</Text>
        <TextInput value={form.nombre} onChangeText={(v) => setForm((f) => ({ ...f, nombre: v }))} className="border border-igb-outline rounded-lg px-4 py-3 mb-4 bg-white text-igb-on-surface" placeholder="Nombre y apellido" />

        <Text className="text-igb-on-surface mb-1 font-medium">Teléfono</Text>
        <TextInput value={form.telefono} onChangeText={(v) => setForm((f) => ({ ...f, telefono: v }))} keyboardType="phone-pad" className="border border-igb-outline rounded-lg px-4 py-3 mb-4 bg-white text-igb-on-surface" placeholder="011 1234-5678" />

        <Text className="text-igb-on-surface mb-1 font-medium">Roles</Text>
        <View className="flex-row flex-wrap mb-4">
          {ROLES_OPERARIO.map((r) => {
            const sel = roles.includes(r)
            return (
              <Pressable key={r} onPress={() => setRoles((cur) => (sel ? cur.filter((x) => x !== r) : [...cur, r]))} className={`px-3 py-1.5 rounded-full mr-2 mb-2 border ${sel ? 'bg-igb-navy border-igb-navy' : 'bg-white border-igb-outline'}`}>
                <Text className={`text-sm ${sel ? 'text-white' : 'text-igb-on-surface'}`}>{r}</Text>
              </Pressable>
            )
          })}
        </View>

        {error && <ErrorBanner message={error} />}

        {/* ponytail: disabled: no aplica en RN Web — opacity a mano. */}
        <Pressable onPress={handleSave} disabled={saving} className={`bg-igb-yellow rounded-lg py-3.5 items-center mb-3 ${saving ? 'opacity-60' : ''}`}>
          {saving ? <ActivityIndicator color={colors.onYellow} /> : <Text className="text-igb-on-yellow font-bold">Guardar</Text>}
        </Pressable>
        <Pressable onPress={() => setShowForm(false)} className="items-center py-2">
          <Text className="text-igb-secondary">Cancelar</Text>
        </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  return (
    <View className="flex-1 bg-igb-surface">
      <View className="flex-row px-4 pt-4">
        {VISTAS.map((v) => (
          <Pressable key={v.key} onPress={() => setVista(v.key)} className={`flex-1 py-2.5 items-center rounded-lg mr-2 ${vista === v.key ? 'bg-igb-navy' : 'bg-white border border-igb-outline'}`}>
            <Text className={`text-sm font-medium ${vista === v.key ? 'text-white' : 'text-igb-on-surface'}`}>{v.label}</Text>
          </Pressable>
        ))}
      </View>
      {vista === 'ex' ? (
        <ScrollView className="flex-1 px-4 pt-4">
          {exError && <Text className="text-igb-error text-center">{exError}</Text>}
          {!exError && exOperarios.length === 0 && (
            <Text className="text-igb-secondary text-sm text-center mt-12">Todavía no hay ex operarios.</Text>
          )}
          {exOperarios.map((o) => (
            <View key={o.id} className="flex-row items-center bg-white border border-igb-outline rounded-lg px-3 py-3 mb-2.5">
              {o.foto_url ? (
                <Image source={{ uri: o.foto_url }} contentFit="cover" cachePolicy="disk" className="w-10 h-10 rounded-full mr-3" />
              ) : (
                <View className="w-10 h-10 rounded-full items-center justify-center mr-3 bg-igb-secondary/10">
                  <Ionicons name="people-outline" size={20} color={colors.secondary} />
                </View>
              )}
              <View className="flex-1 mr-2">
                <Text className="font-semibold text-igb-secondary" numberOfLines={1}>{o.nombre}</Text>
                <Text className="text-igb-secondary text-xs mt-0.5" numberOfLines={1}>
                  {[o.roles?.join(', '), o.eliminado_at ? `Baja: ${new Date(o.eliminado_at).toLocaleDateString('es-AR')}` : null].filter(Boolean).join(' — ')}
                </Text>
              </View>
              <Pressable onPress={() => handleReincorporar(o)} className="border border-igb-navy/30 rounded-lg px-3 py-2">
                <Text className="text-igb-navy text-sm font-medium">Reincorporar</Text>
              </Pressable>
              <Pressable onPress={() => handleEliminarDefinitivo(o)} hitSlop={8} className="ml-2 p-2" accessibilityLabel="Eliminar definitivamente">
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </Pressable>
            </View>
          ))}
          <View className="h-24" />
        </ScrollView>
      ) : loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.yellow} /></View>
      ) : loadError ? (
        <View className="flex-1 items-center px-4 pt-8">
          <Text className="text-igb-error text-center">{loadError}</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-4 pt-4">
          {operariosOrdenados.length === 0 && (
            <View className="items-center pt-16 px-6">
              <Ionicons name="people-outline" size={40} color={colors.secondary} />
              <Text className="text-igb-secondary text-sm text-center mt-3">
                Todavía no hay operarios cargados.{'\n'}Tocá + para agregar el primero.
              </Text>
            </View>
          )}
          {[
            { titulo: null, lista: operariosActivos },
            { titulo: 'Inactivos', lista: operariosInactivos },
          ].map(({ titulo, lista }) =>
            lista.length === 0 ? null : (
              <View key={titulo ?? 'activos'}>
                {titulo && (
                  <View className="mt-3 mb-2">
                    <Text className="text-igb-on-surface text-sm font-semibold">{titulo}</Text>
                    <Text className="text-igb-secondary text-xs">No aparecen al crear eventos nuevos. Activalos con el interruptor.</Text>
                  </View>
                )}
                {lista.map((o) => (
                  <CatalogRow
                    key={o.id}
                    icon="people-outline"
                    fotoUrl={o.foto_url}
                    title={o.nombre}
                    subtitle={[o.roles?.join(', '), o.telefono].filter(Boolean).join(' — ')}
                    activo={o.activo}
                    estado={estadoDe(o)}
                    onToggle={() => handleToggle(o)}
                    onOpenDetail={() => router.push(`/catalogos/recurso/operarios/${o.id}`)}
                  />
                ))}
              </View>
            ),
          )}
          <View className="h-24" />
        </ScrollView>
      )}
      {vista === 'activos' && <Pressable onPress={openNew} className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-igb-yellow items-center justify-center shadow-lg">
        <Text className="text-2xl text-igb-on-yellow">+</Text>
      </Pressable>}
    </View>
  )
}
