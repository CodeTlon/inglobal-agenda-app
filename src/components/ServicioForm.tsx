import { useState } from 'react'
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, Switch, Image, Alert } from 'react-native'
import { createServicio, updateServicio, type ServicioPayload } from '@/lib/servicios-api'
import { pickAndUploadImage } from '@/lib/upload'
import { ApiError } from '@/lib/api'
import type { Servicio } from '@/lib/types'

export function ServicioForm({ initial, onDone }: { initial?: Servicio; onDone: () => void }) {
  const isEdit = !!initial
  const [title, setTitle] = useState(initial?.title ?? '')
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? '')
  const [desc, setDesc] = useState(initial?.desc ?? '')
  const [specsText, setSpecsText] = useState((initial?.specs ?? []).join('\n'))
  const [img, setImg] = useState(initial?.img ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? '')
  const [displayOrder, setDisplayOrder] = useState(String(initial?.display_order ?? 0))
  const [published, setPublished] = useState(initial?.published ?? true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePickImg() {
    setUploading(true)
    try {
      const url = await pickAndUploadImage('servicios')
      if (url) setImg(url)
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo subir la imagen.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit() {
    if (!title.trim()) return setError('El título es obligatorio.')
    if (!img) return setError('La imagen es obligatoria.')
    if (!icon.trim()) return setError('El ícono es obligatorio.')
    setSaving(true)
    setError(null)
    const specs = specsText.split('\n').map((s) => s.trim()).filter(Boolean)
    const payload: ServicioPayload = {
      title,
      desc,
      excerpt,
      specs: JSON.stringify(specs),
      img,
      icon,
      display_order: Number(displayOrder) || 0,
      published,
    }
    try {
      if (isEdit) await updateServicio(initial.id, payload)
      else await createServicio(payload)
      onDone()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar el servicio.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView className="flex-1 bg-igb-surface px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
      <Text className="text-igb-on-surface mb-1 font-medium">Imagen</Text>
      <Pressable onPress={handlePickImg} className="border border-igb-outline rounded-lg bg-white items-center justify-center mb-4 h-32">
        {uploading ? (
          <ActivityIndicator color="#f5d100" />
        ) : img ? (
          <Image source={{ uri: img }} className="w-full h-full rounded-lg" resizeMode="cover" />
        ) : (
          <Text className="text-igb-secondary">Tocá para subir una foto</Text>
        )}
      </Pressable>

      <Text className="text-igb-on-surface mb-1 font-medium">Título</Text>
      <TextInput value={title} onChangeText={setTitle} maxLength={60} className="border border-igb-outline rounded-lg px-4 py-3 mb-4 bg-white text-igb-on-surface" placeholder="Ej: Grúas Telescópicas" />

      <Text className="text-igb-on-surface mb-1 font-medium">Descripción corta (para el home)</Text>
      <TextInput value={excerpt} onChangeText={setExcerpt} maxLength={130} multiline numberOfLines={2} className="border border-igb-outline rounded-lg px-4 py-3 mb-4 bg-white text-igb-on-surface" placeholder="10 a 130 caracteres" />

      <Text className="text-igb-on-surface mb-1 font-medium">Descripción completa</Text>
      <TextInput value={desc} onChangeText={setDesc} multiline numberOfLines={5} textAlignVertical="top" className="border border-igb-outline rounded-lg px-4 py-3 mb-4 bg-white text-igb-on-surface" placeholder="Descripción detallada del servicio" />

      <Text className="text-igb-on-surface mb-1 font-medium">Características (una por línea)</Text>
      <TextInput value={specsText} onChangeText={setSpecsText} multiline numberOfLines={4} textAlignVertical="top" className="border border-igb-outline rounded-lg px-4 py-3 mb-4 bg-white text-igb-on-surface" placeholder={'Hasta 50 toneladas\nAlcance de 40 metros'} />

      <Text className="text-igb-on-surface mb-1 font-medium">Ícono (nombre lucide-react)</Text>
      <TextInput value={icon} onChangeText={setIcon} autoCapitalize="none" className="border border-igb-outline rounded-lg px-4 py-3 mb-4 bg-white text-igb-on-surface" placeholder="Ej: crane" />

      <Text className="text-igb-on-surface mb-1 font-medium">Orden</Text>
      <TextInput value={displayOrder} onChangeText={setDisplayOrder} keyboardType="numeric" className="border border-igb-outline rounded-lg px-4 py-3 mb-4 bg-white text-igb-on-surface" />

      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-igb-on-surface font-medium">Publicado</Text>
        <Switch value={published} onValueChange={setPublished} trackColor={{ true: '#f5d100' }} />
      </View>

      {error && <Text className="text-red-600 mb-3">{error}</Text>}

      <Pressable onPress={handleSubmit} disabled={saving} className="bg-igb-yellow rounded-lg py-3.5 items-center disabled:opacity-60">
        {saving ? <ActivityIndicator color="#221b00" /> : <Text className="text-igb-on-yellow font-bold">{isEdit ? 'Guardar cambios' : 'Crear servicio'}</Text>}
      </Pressable>
    </ScrollView>
  )
}
