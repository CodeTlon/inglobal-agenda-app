import * as ImagePicker from 'expo-image-picker'
import { supabase } from './supabase'

// Mismo patrón que lib/client-upload.ts en inglobal-site: subida directa al bucket
// `media` desde el cliente autenticado (bypass del Server Action/Route Handler para
// el binario), solo se manda la URL final al API.
export async function pickAndUploadImage(folder: string): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permission.granted) throw new Error('Se necesita permiso para acceder a tus fotos.')

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
  })
  if (result.canceled || !result.assets[0]) return null

  const asset = result.assets[0]
  const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${folder}/${Date.now()}.${ext}`
  const arrayBuffer = await fetch(asset.uri).then((r) => r.arrayBuffer())

  const { error } = await supabase.storage.from('media').upload(path, arrayBuffer, {
    contentType: asset.mimeType ?? 'image/jpeg',
  })
  if (error) throw new Error('No se pudo subir la imagen.')

  const { data } = supabase.storage.from('media').getPublicUrl(path)
  return data.publicUrl
}
