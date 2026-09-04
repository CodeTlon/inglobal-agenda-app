import { useEffect, useState } from 'react'
import { Modal, Pressable, View } from 'react-native'
import { Text } from '@/components/Text'

type EstiloBoton = 'default' | 'cancel' | 'destructive'
type Boton = { text: string; style?: EstiloBoton; onPress?: () => void }
type Estado = { title: string; message?: string; buttons: Boton[] } | null

// ponytail: Alert.alert nativo (iOS/Android/web) es un diálogo del SO, no se
// puede restylear. Este modal imperativo copia su misma firma (title,
// message, buttons) para no tocar los call sites existentes, pero dibujado
// con los tokens de InGlobal. Sin librería nueva: un listener module-level +
// <Modal> de RN.
let listener: ((s: Estado) => void) | null = null

const BOTON_BG: Record<EstiloBoton, string> = {
  default: 'bg-igb-yellow',
  destructive: 'bg-igb-error',
  cancel: 'bg-white border border-igb-outline',
}
const BOTON_TEXTO: Record<EstiloBoton, string> = {
  default: 'text-igb-on-yellow',
  destructive: 'text-white',
  cancel: 'text-igb-on-surface',
}

export function DialogHost() {
  const [estado, setEstado] = useState<Estado>(null)
  useEffect(() => {
    listener = setEstado
    return () => {
      listener = null
    }
  }, [])

  if (!estado) return null

  function cerrar(onPress?: () => void) {
    setEstado(null)
    onPress?.()
  }

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => setEstado(null)}>
      <Pressable className="flex-1 bg-black/50 items-center justify-center px-8" onPress={() => setEstado(null)}>
        {/* Pressable interno vacío para que tocar la tarjeta no cierre el modal (no propaga al overlay) */}
        <Pressable className="bg-white rounded-lg p-5 w-full" style={{ maxWidth: 340 }} onPress={() => {}}>
          <Text className="font-headline text-lg text-igb-on-surface">{estado.title}</Text>
          {estado.message ? <Text className="text-igb-secondary mt-2">{estado.message}</Text> : null}
          <View className="mt-5 gap-2">
            {estado.buttons.map((b, i) => (
              <Pressable
                key={i}
                onPress={() => cerrar(b.onPress)}
                className={`rounded-lg py-3 items-center ${BOTON_BG[b.style ?? 'default']}`}
              >
                <Text className={`font-semibold ${BOTON_TEXTO[b.style ?? 'default']}`}>{b.text}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// Reemplazo de Alert.alert: mismo orden de argumentos (title, message, buttons).
export function confirmDialog(title: string, message?: string, buttons: Boton[] = [{ text: 'Entendido' }]) {
  listener?.({ title, message, buttons })
}
