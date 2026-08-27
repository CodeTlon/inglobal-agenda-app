import { useState } from 'react'
import { View, Pressable, ActivityIndicator, Linking } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/Text'
import { api, ApiError } from '@/lib/api'

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
  const [permission, requestPermission] = useCameraPermissions()
  const [scannedToken, setScannedToken] = useState<string | null>(null)
  const [approving, setApproving] = useState(false)
  const [result, setResult] = useState<'ok' | 'error' | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

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
          <Pressable onPress={() => Linking.openSettings()} className="bg-igb-yellow rounded-lg px-6 py-3">
            <Text className="text-igb-on-yellow font-bold">Abrir Ajustes</Text>
          </Pressable>
        </View>
      )
    }
    return (
      <View className="flex-1 items-center justify-center bg-igb-surface p-8">
        <Text className="text-igb-on-surface text-center mb-4">Necesitamos acceso a la cámara para escanear el código QR de la TV.</Text>
        <Pressable onPress={requestPermission} className="bg-igb-yellow rounded-lg px-6 py-3">
          <Text className="text-igb-on-yellow font-bold">Dar permiso</Text>
        </Pressable>
      </View>
    )
  }

  if (result === 'ok') {
    return (
      <View className="flex-1 items-center justify-center bg-igb-surface p-8">
        <Ionicons name="checkmark-circle" size={48} color="#16a34a" style={{ marginBottom: 16 }} />
        <Text className="text-igb-on-surface font-semibold text-lg mb-2 text-center">TV vinculada</Text>
        <Text className="text-igb-secondary text-center mb-6">La televisión ya debería mostrar la agenda.</Text>
        <Pressable onPress={reset} className="bg-igb-yellow rounded-lg px-6 py-3">
          <Text className="text-igb-on-yellow font-bold">Vincular otra</Text>
        </Pressable>
      </View>
    )
  }

  if (scannedToken) {
    return (
      <View className="flex-1 items-center justify-center bg-igb-surface p-8">
        <Ionicons name="tv-outline" size={48} color="#1C357F" style={{ marginBottom: 16 }} />
        <Text className="text-igb-on-surface font-semibold text-lg mb-2 text-center">¿Aprobar el inicio de sesión en esta TV?</Text>
        {result === 'error' && <Text className="text-igb-error text-center mb-4">{errorMsg}</Text>}
        <Pressable onPress={handleApprove} disabled={approving} className="bg-igb-yellow rounded-lg px-6 py-3 mb-3 w-full items-center disabled:opacity-60">
          {approving ? <ActivityIndicator color="#221b00" /> : <Text className="text-igb-on-yellow font-bold">Aprobar</Text>}
        </Pressable>
        <Pressable onPress={reset} hitSlop={8} className="items-center py-2">
          <Text className="text-igb-secondary">Cancelar</Text>
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
          if (token) setScannedToken(token)
        }}
      />
      <View className="absolute bottom-10 left-0 right-0 items-center">
        <Text className="text-white bg-black/60 px-4 py-2 rounded-lg">Apuntá al código QR de la TV</Text>
      </View>
    </View>
  )
}
