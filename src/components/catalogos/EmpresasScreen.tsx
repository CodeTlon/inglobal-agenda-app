import { useCallback, useState } from 'react'
import { View, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { Text } from '@/components/Text'
import { TextInput } from '@/components/TextInput'
import { getEmpresasAgenda, createEmpresaAgenda, updateEmpresaAgenda, toggleEmpresaAgenda, deleteEmpresaAgenda } from '@/lib/agenda-api'
import { ApiError } from '@/lib/api'
import type { EmpresaAgenda } from '@/lib/types'
import { CatalogRow } from '@/components/CatalogRow'

const EMPTY = { nombre: '', contacto: '', telefono: '', notas: '' }

export default function EmpresasScreen() {
  const [empresas, setEmpresas] = useState<EmpresaAgenda[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<EmpresaAgenda | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    getEmpresasAgenda(true).then(setEmpresas).finally(() => setLoading(false))
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  function openNew() {
    setEditing(null)
    setForm(EMPTY)
    setError(null)
    setShowForm(true)
  }
  function openEdit(e: EmpresaAgenda) {
    setEditing(e)
    setForm({ nombre: e.nombre, contacto: e.contacto ?? '', telefono: e.telefono ?? '', notas: e.notas ?? '' })
    setError(null)
    setShowForm(true)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const payload = { nombre: form.nombre, contacto: form.contacto, telefono: form.telefono, notas: form.notas || null }
      if (editing) await updateEmpresaAgenda(editing.id, payload)
      else await createEmpresaAgenda(payload)
      setShowForm(false)
      load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(e: EmpresaAgenda) {
    try {
      await toggleEmpresaAgenda(e.id, e.activo)
      load()
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo actualizar.')
    }
  }

  async function handleDelete(e: EmpresaAgenda) {
    try {
      await deleteEmpresaAgenda(e.id)
      load()
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo eliminar.')
    }
  }

  if (showForm) {
    return (
      <ScrollView className="flex-1 bg-igb-surface px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="text-igb-on-surface mb-1 font-medium">Nombre</Text>
        <TextInput value={form.nombre} onChangeText={(v) => setForm((f) => ({ ...f, nombre: v }))} className="border border-igb-outline rounded-lg px-4 py-3 mb-4 bg-white text-igb-on-surface" placeholder="Ej: Transportes SRL" />

        <Text className="text-igb-on-surface mb-1 font-medium">Contacto</Text>
        <TextInput value={form.contacto} onChangeText={(v) => setForm((f) => ({ ...f, contacto: v }))} className="border border-igb-outline rounded-lg px-4 py-3 mb-4 bg-white text-igb-on-surface" placeholder="Nombre del contacto" />

        <Text className="text-igb-on-surface mb-1 font-medium">Teléfono</Text>
        <TextInput value={form.telefono} onChangeText={(v) => setForm((f) => ({ ...f, telefono: v }))} keyboardType="phone-pad" className="border border-igb-outline rounded-lg px-4 py-3 mb-4 bg-white text-igb-on-surface" placeholder="011 1234-5678" />

        <Text className="text-igb-on-surface mb-1 font-medium">Notas</Text>
        <TextInput value={form.notas} onChangeText={(v) => setForm((f) => ({ ...f, notas: v }))} multiline numberOfLines={3} className="border border-igb-outline rounded-lg px-4 py-3 mb-4 bg-white text-igb-on-surface" placeholder="Opcional" />

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
          {empresas.map((e) => (
            <CatalogRow
              key={e.id}
              icon="business-outline"
              title={e.nombre}
              subtitle={[e.contacto, e.telefono].filter(Boolean).join(' — ')}
              activo={e.activo}
              onToggle={() => handleToggle(e)}
              onEdit={() => openEdit(e)}
              onDelete={() => handleDelete(e)}
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
