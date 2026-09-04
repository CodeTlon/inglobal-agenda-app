import { supabase } from '@/lib/supabase'
import * as ImagePicker from 'expo-image-picker'
import { File, Paths } from 'expo-file-system'

// La foto/logo se sube al bucket `media` que ya existe para el resto del
// sitio (ver inglobal-site/supabase/migrations/006_storage_media.sql) —
// nada de bucket ni políticas nuevas, solo una carpeta propia por tipo.
export async function subirFoto(carpeta: string, id: string, uri: string): Promise<string> {
  // `fetch(uri)` sobre un archivo local `file://` es lo que venía usándose
  // acá, pero en este armado de Expo/RN nunca completa la conexión (siempre
  // tiraba "network request failed" / error de conexión, no importa el
  // archivo) — `fetch` está pensado para requests de red, no para leer del
  // filesystem. `File` (mismo módulo que ya usa elegirFotoDeGaleria) lee el
  // archivo directo, sin pasar por la capa de red.
  const file = new File(uri)
  // Sin este chequeo, un archivo local que ya no existe (ver comentario en
  // elegirFotoDeGaleria) tira un error críptico del lado nativo al leerlo.
  if (!file.exists) throw new Error('No se pudo leer la foto elegida: el archivo ya no existe.')
  const buffer = await file.arrayBuffer()
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

export async function elegirFotoDeGaleria(): Promise<string | null> {
  const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permiso.granted) return null
  // allowsEditing abre el editor nativo del OS (iOS/Android) para
  // recortar/centrar antes de confirmar — el "estándar" de subir foto,
  // sin reinventar una UI de recorte a mano en RN.
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  })
  if (result.canceled) return null
  const picked = result.assets[0]
  // El archivo temporal que devuelve el picker puede dejar de existir para
  // cuando se termina de subir — entre elegir la foto y tocar Guardar pasa
  // la validación del form y un round-trip de red (crear el recurso) antes
  // de llegar a subirFoto, y el OS puede limpiar ese temporal en el medio.
  // Copiarla ahora a un archivo propio de la app la deja disponible pase lo
  // que pase después.
  const ext = picked.uri.toLowerCase().endsWith('.png') ? 'png' : 'jpg'
  const destino = new File(Paths.cache, `foto-elegida-${Date.now()}.${ext}`)
  await new File(picked.uri).copy(destino)
  return destino.uri
}
