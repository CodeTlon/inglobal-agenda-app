import { Platform } from 'react-native'
import * as Device from 'expo-device'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'
import { api } from './api'
import { Notifications } from './notifications'

// Push remoto solo funciona en un dispositivo físico con build nativo (no Expo Go en
// Android, no web, no emulador sin Google Play). En el resto, todo es no-op.
const SOPORTADO = Notifications !== null && (Platform.OS === 'ios' || Platform.OS === 'android')
const KEY_AVISOS = 'avisos_push_habilitados'
const KEY_TOKEN = 'avisos_push_token'

// En primer plano también se muestra el aviso (por defecto RN lo silencia).
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  })
}

/** `false` en Expo Go, web o emulador: ahí los avisos push no existen, no es un tema de permisos. */
export const pushDisponible = SOPORTADO && Device.isDevice

export async function avisosHabilitados(): Promise<boolean> {
  if (!SOPORTADO) return false
  return (await SecureStore.getItemAsync(KEY_AVISOS).catch(() => null)) !== 'no'
}

async function obtenerToken(pedirPermiso: boolean): Promise<string | null> {
  if (!SOPORTADO || !Notifications || !Device.isDevice) return null

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('agenda', {
      name: 'Agenda',
      importance: Notifications.AndroidImportance.HIGH,
    })
  }

  let { status } = await Notifications.getPermissionsAsync()
  if (status !== 'granted' && pedirPermiso) status = (await Notifications.requestPermissionsAsync()).status
  if (status !== 'granted') return null

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined
  if (!projectId) return null
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data
}

/** Registra este dispositivo en el backend. Devuelve `false` si no se pudo (sin permiso, sin soporte, sin red). */
export async function registrarPush(pedirPermiso = false): Promise<boolean> {
  try {
    const token = await obtenerToken(pedirPermiso)
    if (!token) return false
    await api.post('/push/registrar', { token, plataforma: Platform.OS })
    await SecureStore.setItemAsync(KEY_TOKEN, token)
    await SecureStore.setItemAsync(KEY_AVISOS, 'si')
    return true
  } catch {
    return false
  }
}

/** Da de baja este dispositivo (logout o interruptor apagado). Best-effort: nunca bloquea. */
export async function desregistrarPush(): Promise<void> {
  if (!SOPORTADO) return
  try {
    const token = await SecureStore.getItemAsync(KEY_TOKEN)
    if (token) await api.delete('/push/registrar', { token })
    await SecureStore.deleteItemAsync(KEY_TOKEN)
  } catch {
    // Si falla, el backend limpia el token solo cuando Expo lo reporta DeviceNotRegistered.
  }
}

export async function apagarAvisos(): Promise<void> {
  await SecureStore.setItemAsync(KEY_AVISOS, 'no').catch(() => {})
  await desregistrarPush()
}

/** Ruta a abrir al tocar un aviso (`data` lo arma app/api/agenda/cron/notificar en inglobal-site). */
export function rutaDeAviso(data: Record<string, unknown> | undefined): string {
  if (data?.tipo === 'reserva' && typeof data.eventoId === 'string') return `/agenda/evento/${data.eventoId}`
  return '/agenda'
}

/**
 * Solo desarrollo (`__DEV__`): dispara un aviso LOCAL con los mismos textos que arma el backend
 * (`armarResumenManana` / `armarAvisoReserva` en inglobal-site) para ver cómo se ve y probar el toque.
 * No pasa por Expo Push ni APNs, así que no valida el envío real. Devuelve `false` si no hay permiso o soporte.
 */
export async function probarAviso(tipo: 'recordatorio' | 'reserva'): Promise<boolean> {
  if (!__DEV__ || !Notifications || Platform.OS === 'web') return false
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('agenda', { name: 'Agenda', importance: Notifications.AndroidImportance.HIGH })
  }
  let { status } = await Notifications.getPermissionsAsync()
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status
  if (status !== 'granted') return false

  const contenido =
    tipo === 'recordatorio'
      ? { title: 'Mañana: 2 servicios', body: '08:00 Grúa 12 - Empresa Y\n10:30 Grúa 3 - Empresa Z', data: { tipo: 'recordatorio' } }
      : { title: 'Reserva sin confirmar', body: '08:00 Grúa 12 - Empresa Y se cancela sola al llegar su hora. Confirmala o reprogramala.', data: { tipo: 'reserva' } }
  await Notifications.scheduleNotificationAsync({
    content: { ...contenido, sound: 'default' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3, channelId: 'agenda' },
  })
  return true
}
