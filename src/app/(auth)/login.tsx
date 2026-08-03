import { useState } from 'react'
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { supabase } from '@/lib/supabase'

// Sin pantalla de registro — las cuentas se siguen creando a mano desde
// /dashboard/usuarios en el sitio web, no hay flujo de alta público.
export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin() {
    if (!email || !password) {
      setError('Completá email y contraseña.')
      return
    }
    setLoading(true)
    setError(null)
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (authError) setError('Email o contraseña incorrectos.')
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-igb-surface"
    >
      <View className="flex-1 justify-center px-8">
        <Text className="text-3xl font-bold text-igb-on-surface mb-1">Grúas InGlobal</Text>
        <Text className="text-igb-secondary mb-8">Agenda — Ingresá con tu cuenta del panel</Text>

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
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          className="border border-igb-outline rounded-lg px-4 py-3 mb-2 bg-white text-igb-on-surface"
          placeholder="••••••••"
        />

        {error && <Text className="text-red-600 mb-4">{error}</Text>}

        <Pressable
          onPress={handleLogin}
          disabled={loading}
          className="bg-igb-yellow rounded-lg py-3.5 items-center mt-4 disabled:opacity-60"
        >
          {loading ? <ActivityIndicator color="#221b00" /> : <Text className="text-igb-on-yellow font-bold">Ingresar</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}
