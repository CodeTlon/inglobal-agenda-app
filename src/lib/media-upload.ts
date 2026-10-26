import { ApiError } from '@/lib/api'
import { getToken } from '@/lib/auth'
import * as ImagePicker from 'expo-image-picker'
import { File, Paths } from 'expo-file-system'

// La foto/logo se sube a la API del sitio (POST /api/storage/upload), que la guarda en el
// bucket `media` y devuelve la URL pública. Una carpeta propia por tipo.
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
  const esPng = uri.toLowerCase().endsWith('.png')
  const form = new FormData()
  // En React Native el archivo se adjunta como { uri, name, type }.
  form.append('file', { uri, name: `${id}.${esPng ? 'png' : 'jpg'}`, type: esPng ? 'image/png' : 'image/jpeg' } as unknown as Blob)
  form.append('folder', carpeta)
  const token = await getToken()
  const res = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL ?? ''}/api/storage/upload`, {
    method: 'POST',
    credentials: 'omit', // solo Bearer, ver src/lib/auth.ts
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(body.error ?? 'No se pudo subir la foto.', res.status)
  // Cada subida genera un path nuevo (uuid), así que <Image> no reutiliza una foto
  // cacheada de la versión anterior.
  return body.data.url as string
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
