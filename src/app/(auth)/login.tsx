import { useState, useEffect } from 'react'
import { View, Image, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { AuthError } from '@supabase/supabase-js'
import { Text } from '@/components/Text'
import { TextInput } from '@/components/TextInput'
import { ErrorBanner } from '@/components/ErrorBanner'
import { supabase } from '@/lib/supabase'
import { colors } from '@/lib/colors'

const NETWORK_ERROR_MESSAGE = 'No se pudo conectar. Revisá tu conexión a internet e intentá de nuevo.'
// ponytail: contador en memoria, se resetea con reload de la app — no hace
// falta persistirlo, es solo para frenar reintentos rápidos de credenciales
// mientras el rate limit real de Supabase (más laxo) no llega a dispararse.
const MAX_FAILED_ATTEMPTS = 5
const COOLDOWN_MS = 30_000

function authErrorMessage(error: AuthError): string {
  if (error.code === 'invalid_credentials') return 'Email o contraseña incorrectos.'
  if (error.code === 'email_not_confirmed') return 'Tu cuenta todavía no fue confirmada. Contactá al administrador.'
  if (error.code === 'over_request_rate_limit' || error.code === 'over_email_send_rate_limit') {
    return 'Demasiados intentos. Esperá un momento y volvé a intentar.'
  }
  // signInWithPassword no tira excepción con la red cortada — resuelve con
  // status 0. Sin este caso caía al fallback genérico de abajo y mostraba
  // el error crudo de fetch en vez de un mensaje entendible.
  if (error.status === 0) return NETWORK_ERROR_MESSAGE
  if (error.status && error.status >= 500) return 'El servidor no está disponible. Intentá de nuevo en unos minutos.'
  console.error('[login] auth error', error.code, error.status, error.message)
  return `No se pudo iniciar sesión (${error.code ?? error.status ?? '?'}): ${error.message}`
}

// Sin pantalla de registro — las cuentas se siguen creando a mano desde
// /dashboard/usuarios en el sitio web, no hay flujo de alta público.
export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [coolingDown, setCoolingDown] = useState(false)

  // El error de login queda pegado en pantalla para siempre si no lo
  // limpiamos nosotros — se auto-oculta a los 5s, salvo el aviso de cooldown
  // (ese lo saca su propio timer cuando termina el bloqueo, no antes).
  useEffect(() => {
    if (!error || coolingDown) return
    const id = setTimeout(() => setError(null), 5000)
    return () => clearTimeout(id)
  }, [error, coolingDown])

  async function handleLogin() {
    if (!email || !password) {
      setError('Completá email y contraseña.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (authError) {
        // Los fallos de red no cuentan como intento fallido — el contador es
        // para frenar adivinar contraseñas, no para penalizar mala señal.
        if (authError.status !== 0) {
          const next = failedAttempts + 1
          if (next >= MAX_FAILED_ATTEMPTS) {
            setFailedAttempts(0)
            setCoolingDown(true)
            setError('Demasiados intentos fallidos. Esperá 30 segundos e intentá de nuevo.')
            setTimeout(() => {
              setCoolingDown(false)
              setError(null)
            }, COOLDOWN_MS)
            return
          }
          setFailedAttempts(next)
        }
        setError(authErrorMessage(authError))
      } else {
        setFailedAttempts(0)
      }
    } catch (e) {
      console.error('[login] network/unexpected error', e)
      setError(NETWORK_ERROR_MESSAGE)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-igb-surface"
    >
      <View className="flex-1 justify-center px-8">
        <Image
          source={require('../../../assets/images/logo-inglobal.png')}
          resizeMode="contain"
          // ponytail: mismo motivo que perfil/index.tsx — sin un style con
          // tamaño real, RN Web renderiza el logo a su resolución nativa y
          // desborda el ancho de pantalla.
          style={{ width: '100%', height: 64 }}
          className="mb-6"
        />
        <Text className="text-igb-secondary text-center mb-8">Agenda — Ingresá con tu cuenta del panel</Text>

        <Text className="text-igb-on-surface mb-1 font-medium">Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          className="border border-igb-outline rounded-lg px-4 py-3 mb-4 bg-white text-igb-on-surface"
          placeholder="nombre@gruasinglobal.com"
        />

        <Text className="text-igb-on-surface mb-1 font-medium">Contraseña</Text>
        <View className="justify-center mb-2">
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="password"
            className="border border-igb-outline rounded-lg pl-4 pr-11 py-3 bg-white text-igb-on-surface"
            placeholder="••••••••"
          />
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={8}
            className="absolute right-3 self-center"
          >
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.secondary} />
          </Pressable>
        </View>

        {error && <ErrorBanner message={error} />}

        {/* ponytail: disabled: no aplica en RN Web — opacity a mano. */}
        <Pressable
          onPress={handleLogin}
          disabled={loading || coolingDown}
          className={`bg-igb-yellow rounded-lg py-3.5 items-center mt-4 ${loading || coolingDown ? 'opacity-60' : ''}`}
        >
          {loading ? <ActivityIndicator color={colors.onYellow} /> : <Text className="text-igb-on-yellow font-bold">Ingresar</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}
