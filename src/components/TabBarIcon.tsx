import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'

// Ítem de bottom tab: inactivo es ícono+label apilado gris; activo pasa a un
// chip amarillo compacto, como en las referencias de diseño. tabBarShowLabel
// queda en false en el _layout — el label vive acá adentro.
//
// StyleSheet plano a propósito, no NativeWind: dentro del render prop
// tabBarIcon de React Navigation las className (View Y Text) no medían nada
// — el label completo colapsaba a ~7px de ancho (una letra por línea) aunque
// el mismo patrón funciona en cualquier otra pantalla. StyleSheet.create no
// depende del mismo pipeline de medición y renderiza bien ahí.
export function TabBarIcon({
  focused,
  name,
  label,
}: {
  focused: boolean
  name: ComponentProps<typeof Ionicons>['name']
  label: string
}) {
  if (focused) {
    return (
      <View style={styles.focusedPill}>
        <Ionicons name={name} size={20} color="#221b00" />
        <Text style={styles.focusedLabel} numberOfLines={1}>{label}</Text>
      </View>
    )
  }
  return (
    <View style={styles.item}>
      <Ionicons name={name} size={20} color="#575d78" />
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  focusedPill: {
    backgroundColor: '#f5d100',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 6,
    alignItems: 'center',
    gap: 2,
  },
  focusedLabel: {
    color: '#221b00',
    fontSize: 10,
    fontWeight: '600',
  },
  item: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  label: {
    color: '#575d78',
    fontSize: 10,
  },
})
