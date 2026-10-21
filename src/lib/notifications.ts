import { Platform } from 'react-native'
import Constants, { ExecutionEnvironment } from 'expo-constants'
import type * as NotificationsModule from 'expo-notifications'

// Desde SDK 53, expo-notifications LANZA un error al cargarse en Expo Go (Android). Un import
// estático tumbaba _layout.tsx y con él toda la app. Se carga solo si el entorno lo soporta;
// en Expo Go / web queda en null y el resto de la app funciona sin avisos push.
const enExpoGoAndroid = Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient

export const Notifications: typeof NotificationsModule | null =
  Platform.OS === 'web' || enExpoGoAndroid ? null : (require('expo-notifications') as typeof NotificationsModule)
