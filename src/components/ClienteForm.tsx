import { useState } from 'react'
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, Switch, Image, Alert } from 'react-native'
import { createCliente, updateCliente, type ClientePayload } from '@/lib/clientes-api'
import { pickAndUploadImage } from '@/lib/upload'
import { ApiError } from '@/lib/api'
import type { Cliente } from '@/lib/types'

export function ClienteForm({ initial, onDone }: { initial?: Cliente; onDone: () => void }) {
  const isEdit = !!initial
  const [name, setName] = useState(initial?.name ?? '')
  const [logo, setLogo] = useState(initial?.logo ?? '')
  const [bio, setBio] = useState(initial?.bio ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [featured, setFeatured] = useState(initial?.featured ?? true)
  const [workRank, setWorkRank] = useState(String(initial?.work_rank ?? 10))
  const [published, setPublished] = useState(initial?.published ?? true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePickLogo() {
    setUploading(true)
    try {
      const url = await pickAndUploadImage('clientes')
      if (url) setLogo(url)
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo subir la imagen.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit() {
    if (!name.trim()) return setError('El nombre es obligatorio.')
    if (!logo) return setError('El logo es obligatorio.')
    setSaving(true)
    setError(null)
    const payload: ClientePayload = {
      name,
      logo,
      bio,
      content,
      featured,
      work_rank: Number(workRank) || 10,
      published,
    }
    try {
      if (isEdit) await updateCliente(initial.id, payload)
      else await createCliente(payload)
      onDone()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar el cliente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView className="flex-1 bg-igb-surface px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
      <Text className="text-igb-on-surface mb-1 font-medium">Logo</Text>
      <Pressable onPress={handlePickLogo} className="border border-igb-outline rounded-lg bg-white items-center justify-center mb-4 h-32">
        {uploading ? (
          <ActivityIndicator color="#f5d100" />
        ) : logo ? (
          <Image source={{ uri: logo }} className="w-full h-full rounded-lg" resizeMode="contain" />
        ) : (
          <Text className="text-igb-secondary">Tocá para subir una foto</Text>
        )}
      </Pressable>

      <Text className="text-igb-on-surface mb-1 font-medium">Nombre</Text>
      <TextInput value={name} onChangeText={setName} className="border border-igb-outline rounded-lg px-4 py-3 mb-4 bg-white text-igb-on-surface" placeholder="Nombre del cliente" />

      <Text className="text-igb-on-surface mb-1 font-medium">Bio (resumen corto)</Text>
      <TextInput value={bio} onChangeText={setBio} multiline numberOfLines={3} className="border border-igb-outline rounded-lg px-4 py-3 mb-4 bg-white text-igb-on-surface" placeholder="Resumen breve" />

      <Text className="text-igb-on-surface mb-1 font-medium">Historia (párrafos separados por línea en blanco)</Text>
      <TextInput value={content} onChangeText={setContent} multiline numberOfLines={6} textAlignVertical="top" className="border border-igb-outline rounded-lg px-4 py-3 mb-4 bg-white text-igb-on-surface" placeholder="Historia del cliente" />

      <Text className="text-igb-on-surface mb-1 font-medium">Orden (mayor = más arriba)</Text>
      <TextInput value={workRank} onChangeText={setWorkRank} keyboardType="numeric" className="border border-igb-outline rounded-lg px-4 py-3 mb-4 bg-white text-igb-on-surface" />

      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-igb-on-surface font-medium">Destacado</Text>
        <Switch value={featured} onValueChange={setFeatured} trackColor={{ true: '#f5d100' }} />
      </View>
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-igb-on-surface font-medium">Publicado</Text>
        <Switch value={published} onValueChange={setPublished} trackColor={{ true: '#f5d100' }} />
      </View>

      {error && <Text className="text-red-600 mb-3">{error}</Text>}

      <Pressable onPress={handleSubmit} disabled={saving} className="bg-igb-yellow rounded-lg py-3.5 items-center disabled:opacity-60">
        {saving ? <ActivityIndicator color="#221b00" /> : <Text className="text-igb-on-yellow font-bold">{isEdit ? 'Guardar cambios' : 'Crear cliente'}</Text>}
      </Pressable>
    </ScrollView>
  )
}
