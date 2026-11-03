import { useState } from 'react'
import { View, Pressable, ActivityIndicator, Linking } from 'react-native'
import { useRouter } from 'expo-router'
import { CameraView, useCameraPermissions } from 'expo-camera'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Text } from '@/components/Text'
import { api, ApiError } from '@/lib/api'
import { colors } from '@/lib/colors'

function extractToken(scanned: string): string | null {
  try {
    const url = new URL(scanned)
    const token = url.searchParams.get('token')
    if (token) return token
  } catch {
    // no es una URL — tratamos el texto crudo como token si tiene pinta de hex
  }
  return /^[a-f0-9]{20,}$/i.test(scanned) ? scanned : null
}

export default function PairTvScreen() {
  const router = useRouter()
  const [permission, requestPermission] = useCameraPermissions()
  const [scannedToken, setScannedToken] = useState<string | null>(null)
  const [approving, setApproving] = useState(false)
  const [result, setResult] = useState<'ok' | 'error' | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  // Código de verificación que la TV muestra debajo del QR (lo da el servidor). Sin él no se ofrece "Aprobar":
  // aprobar le da a la TV una sesión completa, así que hay que confirmar que el QR es el de la TV que está adelante.
  const [codigo, setCodigo] = useState<string | null>(null)
  const [codigoError, setCodigoError] = useState<string | null>(null)

  async function cargarCodigo(token: string) {
    setCodigo(null)
    setCodigoError(null)
    try {
      const info = await api.get<{ codigo: string }>(`/tv-pair/info?token=${encodeURIComponent(token)}`)
      setCodigo(info.codigo)
    } catch (e) {
      setCodigoError(e instanceof ApiError && e.status !== 0 ? e.message : 'No se pudo consultar el código. Revisá tu conexión.')
    }
  }

  function onEscaneado(token: string) {
    if (scannedToken) return
    setScannedToken(token)
    cargarCodigo(token)
  }

  async function handleApprove() {
    if (!scannedToken) return
    setApproving(true)
    try {
      await api.post('/tv-pair/approve', { token: scannedToken })
      setResult('ok')
    } catch (e) {
      setResult('error')
      setErrorMsg(e instanceof ApiError ? e.message : 'No se pudo vincular la TV.')
    } finally {
      setApproving(false)
    }
  }

  function reset() {
    setScannedToken(null)
    setResult(null)
    setCodigo(null)
    setCodigoError(null)
  }

  if (!permission) {
    return <View className="flex-1 bg-igb-surface" />
  }

  if (!permission.granted) {
    // En iOS, una vez denegado el permiso el sistema no vuelve a mostrar el
    // diálogo — requestPermission() no hace nada. canAskAgain === false es
    // la señal de eso (Android sí puede seguir reintentando el diálogo
    // nativo); solo ahí mandamos a Ajustes.
    if (!permission.canAskAgain) {
      return (
        <View className="flex-1 items-center justify-center bg-igb-surface p-8">
          <Text className="text-igb-on-surface text-center mb-4">
            El acceso a la cámara está denegado. Activalo desde Ajustes para escanear el código QR de la TV.
          </Text>
          <Pressable onPress={() => Linking.openSettings()} className="bg-igb-yellow rounded-lg px-6 py-3.5">
            <Text className="text-igb-on-yellow font-bold">Abrir Ajustes</Text>
          </Pressable>
        </View>
      )
    }
    return (
      <View className="flex-1 items-center justify-center bg-igb-surface p-8">
        <Text className="text-igb-on-surface text-center mb-4">Necesitamos acceso a la cámara para escanear el código QR de la TV.</Text>
        <Pressable onPress={requestPermission} className="bg-igb-yellow rounded-lg px-6 py-3.5">
          <Text className="text-igb-on-yellow font-bold">Dar permiso</Text>
        </Pressable>
      </View>
    )
  }

  if (result === 'ok') {
    return (
      <View className="flex-1 items-center justify-center bg-igb-surface p-8">
        <Ionicons name="checkmark-circle" size={48} color={colors.success} style={{ marginBottom: 16 }} />
        <Text className="text-igb-on-surface font-semibold text-lg mb-2 text-center">TV vinculada</Text>
        <Text className="text-igb-secondary text-center mb-6">La televisión ya debería mostrar la agenda.</Text>
        <Pressable onPress={() => router.back()} className="bg-igb-yellow rounded-lg px-6 py-3.5">
          <Text className="text-igb-on-yellow font-bold">Listo</Text>
        </Pressable>
      </View>
    )
  }

  if (scannedToken) {
    return (
      <View className="flex-1 items-center justify-center bg-igb-surface p-8">
        <Ionicons name="tv-outline" size={48} color={colors.navy} style={{ marginBottom: 16 }} />
        <Text className="text-igb-on-surface font-semibold text-lg mb-2 text-center">¿Aprobar el inicio de sesión en esta TV?</Text>
        {codigo ? (
          <>
            <Text className="text-igb-secondary text-center">Aprobá solo si la TV que tenés adelante muestra este código:</Text>
            <Text className="font-headline text-igb-navy text-center my-4" style={{ fontSize: 34, letterSpacing: 6 }} maxFontSizeMultiplier={1.2}>
              {codigo}
            </Text>
            {result === 'error' && <Text className="text-igb-error text-center mb-4">{errorMsg}</Text>}
            {/* ponytail: disabled: no aplica en RN Web — opacity a mano. */}
            <Pressable onPress={handleApprove} disabled={approving} className={`bg-igb-yellow rounded-lg py-3.5 mb-3 w-full items-center ${approving ? 'opacity-60' : ''}`}>
              {approving ? <ActivityIndicator color={colors.onYellow} /> : <Text className="text-igb-on-yellow font-bold">Coincide, aprobar</Text>}
            </Pressable>
          </>
        ) : codigoError ? (
          <>
            <Text className="text-igb-error text-center mb-4">{codigoError}</Text>
            <Pressable onPress={() => cargarCodigo(scannedToken)} className="bg-igb-yellow rounded-lg py-3.5 mb-3 w-full items-center">
              <Text className="text-igb-on-yellow font-bold">Reintentar</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator color={colors.yellow} style={{ marginVertical: 24 }} />
        )}
        <Pressable onPress={reset} hitSlop={8} className="items-center py-2">
          <Text className="text-igb-secondary">{codigo ? 'No coincide, cancelar' : 'Escanear otro código'}</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={{ flex: 1 }}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => {
          const token = extractToken(data)
          if (token) onEscaneado(token)
        }}
      />
      <View className="absolute bottom-10 left-0 right-0 items-center">
        <Text className="text-white bg-black/60 px-4 py-2 rounded-lg">Apuntá al código QR de la TV</Text>
      </View>
    </View>
  )
}
