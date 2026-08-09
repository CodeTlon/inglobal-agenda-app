import { useCallback, useState } from 'react'
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import { Text } from '@/components/Text'
import { TextInput } from '@/components/TextInput'
import { useFocusEffect } from 'expo-router'
import { getGruas, createGrua, updateGrua, toggleGrua, deleteGrua } from '@/lib/agenda-api'
import { ApiError } from '@/lib/api'
import { showApiError } from '@/lib/alert'
import { TIPOS_GRUA, type Grua } from '@/lib/types'
import { CatalogRow } from '@/components/CatalogRow'

const EMPTY = { nombre: '', patente: '', capacidad_toneladas: '', tipo: 'Grúa' as string }

export default function GruasScreen() {
  const [gruas, setGruas] = useState<Grua[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Grua | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    getGruas(true).then(setGruas).finally(() => setLoading(false))
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  function openNew() {
    setEditing(null)
    setForm(EMPTY)
    setError(null)
    setShowForm(true)
  }
  function openEdit(g: Grua) {
    setEditing(g)
    setForm({ nombre: g.nombre, patente: g.patente ?? '', capacidad_toneladas: String(g.capacidad_toneladas ?? ''), tipo: g.tipo })
    setError(null)
    setShowForm(true)
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
      if (editing) await updateGrua(editing.id, payload)
      else await createGrua(payload)
      setShowForm(false)
      load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(g: Grua) {
    try {
      await toggleGrua(g.id, g.activo)
      load()
    } catch (e) {
      showApiError(e, 'No se pudo actualizar.', 'No se pudo actualizar la grúa')
    }
  }

  async function handleDelete(g: Grua) {
    try {
      await deleteGrua(g.id)
      load()
    } catch (e) {
      showApiError(e, 'No se pudo eliminar.', 'No se pudo eliminar la grúa')
    }
  }

  if (showForm) {
    return (
      <ScrollView className="flex-1 bg-igb-surface px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
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

        {error && <Text className="text-red-600 mb-3">{error}</Text>}

        <Pressable onPress={handleSave} disabled={saving} className="bg-igb-yellow rounded-lg py-3.5 items-center mb-3 disabled:opacity-60">
          {saving ? <ActivityIndicator color="#221b00" /> : <Text className="text-igb-on-yellow font-bold">Guardar</Text>}
        </Pressable>
        <Pressable onPress={() => setShowForm(false)} className="items-center py-2">
          <Text className="text-igb-secondary">Cancelar</Text>
        </Pressable>
      </ScrollView>
    )
  }

  return (
    <View className="flex-1 bg-igb-surface">
      {loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#f5d100" /></View>
      ) : (
        <ScrollView className="flex-1 px-4 pt-4">
          {gruas.map((g) => (
            <CatalogRow
              key={g.id}
              icon="car-outline"
              title={g.nombre}
              subtitle={`${g.tipo} — ${g.patente ?? 'sin patente'} — ${g.capacidad_toneladas ?? '?'}t`}
              activo={g.activo}
              onToggle={() => handleToggle(g)}
              onEdit={() => openEdit(g)}
              onDelete={() => handleDelete(g)}
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
