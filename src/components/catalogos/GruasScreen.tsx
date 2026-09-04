import { useState } from 'react'
import { View, ScrollView, Pressable, ActivityIndicator, Platform, KeyboardAvoidingView, Image } from 'react-native'
import { useRouter } from 'expo-router'
import { Picker } from '@react-native-picker/picker'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/Text'
import { TextInput } from '@/components/TextInput'
import { ErrorBanner } from '@/components/ErrorBanner'
import { getGruas, createGrua, updateGrua, toggleGrua } from '@/lib/agenda-api'
import { ApiError } from '@/lib/api'
import { showApiError } from '@/lib/alert'
import { confirmDialog } from '@/components/Dialog'
import { useOcupacionDelDia, ordenarCatalogo } from '@/lib/catalog-ocupacion'
import { subirFoto, elegirFotoDeGaleria } from '@/lib/media-upload'
import { TIPOS_GRUA, type Grua } from '@/lib/types'
import { CatalogRow } from '@/components/CatalogRow'
import { colors } from '@/lib/colors'

const EMPTY = { nombre: '', patente: '', capacidad_toneladas: '', tipo: 'Grúa' as string }

export default function GruasScreen() {
  const router = useRouter()
  const { items: gruas, loading, loadError, load, estadoDe } = useOcupacionDelDia(
    getGruas,
    (ev, g) => ev.grua_id === g.id,
    'No se pudieron cargar las grúas.',
  )
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // URI local elegida en el picker — todavía no hay id de grúa para subirla
  // al storage, se sube recién en handleSave una vez creada.
  const [fotoUri, setFotoUri] = useState<string | null>(null)

  // Editar una grúa existente vive en su pantalla de detalle, no acá — este
  // form solo se usa para dar de alta una nueva.
  function openNew() {
    setForm(EMPTY)
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
    if (!form.patente.trim()) return 'La patente es obligatoria.'
    const capacidad = Number(form.capacidad_toneladas)
    if (!form.capacidad_toneladas.trim() || !Number.isFinite(capacidad) || capacidad <= 0) {
      return 'La capacidad debe ser un número mayor a 0.'
    }
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
      const payload = { nombre: form.nombre, patente: form.patente, capacidad_toneladas: Number(form.capacidad_toneladas), tipo: form.tipo }
      const id = (await createGrua(payload)).id
      // La grúa ya quedó creada acá — lo que pase con la foto de ahora en
      // más no debe tapar eso ni bloquear el alta.
      setShowForm(false)
      load()
      if (fotoUri) {
        try {
          const foto_url = await subirFoto('grua-fotos', id, fotoUri)
          await updateGrua(id, { ...payload, foto_url })
          load()
        } catch (e) {
          confirmDialog('Guardado sin foto', e instanceof ApiError ? e.message : 'La grúa se creó, pero no se pudo subir la foto por un problema de conexión. Podés agregarla después editando.')
        }
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(g: Grua) {
    try {
      // Bug preexistente (no introducido en esta sesión): esto mandaba el
      // valor YA negado. El backend espera el valor ACTUAL y lo invierte él
      // mismo (catalogToggle en inglobal-site/lib/agenda-business.ts) — con
      // el negado de más, el servidor terminaba escribiendo el mismo valor
      // que ya tenía (`!(!activo) === activo`): el switch no hacía nada.
      await toggleGrua(g.id, g.activo)
      load()
    } catch (e) {
      showApiError(e, 'No se pudo actualizar.', 'No se pudo actualizar la grúa')
    }
  }

  if (showForm) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
      <ScrollView className="flex-1 bg-igb-surface px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <Pressable onPress={handleElegirFoto} className="items-center mb-4">
          {fotoUri ? (
            <Image source={{ uri: fotoUri }} className="w-20 h-20 rounded-full mb-1" />
          ) : (
            <View className="w-20 h-20 rounded-full bg-igb-navy/10 items-center justify-center mb-1">
              <Ionicons name="car-outline" size={32} color={colors.navy} />
            </View>
          )}
          <Text className="text-igb-navy text-xs font-medium">{fotoUri ? 'Cambiar foto' : 'Agregar foto'}</Text>
        </Pressable>

        <Text className="text-igb-on-surface mb-1 font-medium">Nombre</Text>
        <TextInput value={form.nombre} onChangeText={(v) => setForm((f) => ({ ...f, nombre: v }))} className="border border-igb-outline rounded-lg px-4 py-3 mb-4 bg-white text-igb-on-surface" placeholder="Ej: Grúa 1" />

        <Text className="text-igb-on-surface mb-1 font-medium">Patente</Text>
        <TextInput value={form.patente} onChangeText={(v) => setForm((f) => ({ ...f, patente: v }))} autoCapitalize="characters" className="border border-igb-outline rounded-lg px-4 py-3 mb-4 bg-white text-igb-on-surface" placeholder="AB123CD" />

        <Text className="text-igb-on-surface mb-1 font-medium">Capacidad (toneladas)</Text>
        <TextInput value={form.capacidad_toneladas} onChangeText={(v) => setForm((f) => ({ ...f, capacidad_toneladas: v }))} keyboardType="numeric" className="border border-igb-outline rounded-lg px-4 py-3 mb-4 bg-white text-igb-on-surface" placeholder="10" />

        <Text className="text-igb-on-surface mb-1 font-medium">Tipo</Text>
        <View className="border border-igb-outline rounded-lg bg-white mb-4">
          <Picker selectedValue={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
            {TIPOS_GRUA.map((t) => <Picker.Item key={t} label={t} value={t} />)}
          </Picker>
        </View>

        {error && <ErrorBanner message={error} />}

        {/* ponytail: disabled: no aplica en RN Web (Pressable no es un
            control real con :disabled) — el opacity condicional a mano
            funciona en las tres plataformas. */}
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
      {loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.yellow} /></View>
      ) : loadError ? (
        <View className="flex-1 items-center px-4 pt-8">
          <Text className="text-igb-error text-center">{loadError}</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-4 pt-4">
          {ordenarCatalogo(gruas, estadoDe).map((g) => (
            <CatalogRow
              key={g.id}
              icon="car-outline"
              fotoUrl={g.foto_url}
              title={g.nombre}
              subtitle={`${g.tipo} — ${g.patente ?? 'sin patente'} — ${g.capacidad_toneladas ?? '?'}t`}
              activo={g.activo}
              estado={estadoDe(g)}
              onToggle={() => handleToggle(g)}
              onOpenDetail={() => router.push(`/catalogos/recurso/gruas/${g.id}`)}
            />
          ))}
          <View className="h-24" />
        </ScrollView>
      )}
      <Pressable onPress={openNew} className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-igb-yellow items-center justify-center shadow-lg">
        <Text className="text-2xl text-igb-on-yellow">+</Text>
      </Pressable>
    </View>
  )
}
