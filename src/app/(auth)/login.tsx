import { useState } from 'react'
import { View, Image, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/Text'
import { TextInput } from '@/components/TextInput'
import { supabase } from '@/lib/supabase'

// Sin pantalla de registro — las cuentas se siguen creando a mano desde
// /dashboard/usuarios en el sitio web, no hay flujo de alta público.
export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
        <Image
          source={require('../../../assets/images/logo-inglobal.png')}
          resizeMode="contain"
          className="w-full h-16 mb-6"
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
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#575d78" />
          </Pressable>
        </View>

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
