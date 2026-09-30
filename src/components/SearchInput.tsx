import { View, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { TextInput } from '@/components/TextInput'
import { colors } from '@/lib/colors'

// Normaliza para comparar sin importar mayúsculas ni acentos.
export function normalizar(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function SearchInput({ value, onChangeText, placeholder = 'Buscar' }: { value: string; onChangeText: (v: string) => void; placeholder?: string }) {
  return (
    <View className="flex-row items-center border border-igb-outline rounded-lg bg-white px-3">
      <Ionicons name="search-outline" size={18} color={colors.secondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        className="flex-1 px-2 py-3 text-igb-on-surface"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={colors.secondary} />
        </Pressable>
      )}
    </View>
  )
}
