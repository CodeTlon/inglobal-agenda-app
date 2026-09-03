import { supabase } from '@/lib/supabase'
import * as ImagePicker from 'expo-image-picker'

// La foto/logo se sube al bucket `media` que ya existe para el resto del
// sitio (ver inglobal-site/supabase/migrations/006_storage_media.sql) —
// nada de bucket ni políticas nuevas, solo una carpeta propia por tipo.
export async function subirFoto(carpeta: string, id: string, uri: string): Promise<string> {
  const res = await fetch(uri)
  const buffer = await res.arrayBuffer()
  const esPng = uri.toLowerCase().endsWith('.png')
  const path = `${carpeta}/${id}.${esPng ? 'png' : 'jpg'}`
  const { error } = await supabase.storage.from('media').upload(path, buffer, {
    contentType: esPng ? 'image/png' : 'image/jpeg',
    upsert: true,
  })
  if (error) throw error
  // `upsert: true` sube siempre al mismo path — la publicUrl da idéntica antes y
  // después de reemplazar la foto, así que <Image> (cachea por URL) puede seguir
  // mostrando la vieja después de subir una nueva, en este dispositivo y en el de
  // cualquiera que ya la haya visto. Cache-buster en la URL que se guarda (no solo
  // al renderizar) para que el cambio se note para todos, no solo localmente.
  return `${supabase.storage.from('media').getPublicUrl(path).data.publicUrl}?t=${Date.now()}`
}

// Abre la galería con recorte nativo del OS (editor estándar de iOS/Android,
// sin reinventar una UI de recorte a mano en RN). Devuelve el URI local
// elegido, o null si el usuario canceló o no dio permiso.
export async function elegirFotoDeGaleria(): Promise<string | null> {
  const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permiso.granted) return null
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  })
  if (result.canceled) return null
  return result.assets[0].uri
}
