import { useCallback, useState } from 'react'
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { getOperarios, createOperario, updateOperario, toggleOperario, deleteOperario } from '@/lib/agenda-api'
import { ApiError } from '@/lib/api'
import type { Operario } from '@/lib/types'
import { CatalogRow } from '@/components/CatalogRow'

const EMPTY = { nombre: '', telefono: '' }

export default function OperariosScreen() {
  const [operarios, setOperarios] = useState<Operario[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Operario | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    getOperarios(true).then(setOperarios).finally(() => setLoading(false))
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  function openNew() {
    setEditing(null)
    setForm(EMPTY)
    setError(null)
    setShowForm(true)
  }
  function openEdit(o: Operario) {
    setEditing(o)
    setForm({ nombre: o.nombre, telefono: o.telefono ?? '' })
    setError(null)
    setShowForm(true)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      if (editing) await updateOperario(editing.id, form)
      else await createOperario(form)
      setShowForm(false)
      load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(o: Operario) {
    try {
      const res = await toggleOperario(o.id, o.activo)
      if (res.warning) Alert.alert('Atención', res.warning)
      load()
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo actualizar.')
    }
  }

  async function handleDelete(o: Operario) {
    try {
      await deleteOperario(o.id)
      load()
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo eliminar.')
    }
  }

  if (showForm) {
    return (
      <ScrollView className="flex-1 bg-igb-surface px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="text-igb-on-surface mb-1 font-medium">Nombre</Text>
        <TextInput value={form.nombre} onChangeText={(v) => setForm((f) => ({ ...f, nombre: v }))} className="border border-igb-outline rounded-lg px-4 py-3 mb-4 bg-white text-igb-on-surface" placeholder="Nombre y apellido" />

        <Text className="text-igb-on-surface mb-1 font-medium">Teléfono</Text>
        <TextInput value={form.telefono} onChangeText={(v) => setForm((f) => ({ ...f, telefono: v }))} keyboardType="phone-pad" className="border border-igb-outline rounded-lg px-4 py-3 mb-4 bg-white text-igb-on-surface" placeholder="011 1234-5678" />

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
          {operarios.map((o) => (
            <CatalogRow
              key={o.id}
              title={o.nombre}
              subtitle={o.telefono}
              activo={o.activo}
              onToggle={() => handleToggle(o)}
              onEdit={() => openEdit(o)}
              onDelete={() => handleDelete(o)}
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
