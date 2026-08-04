import { Image, View } from 'react-native'
import { Text } from '@/components/Text'

export function HeaderLogo({ title }: { title?: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <Image source={require('../../assets/images/logo-inglobal.png')} resizeMode="contain" style={{ width: 120, height: 30 }} />
      {title && <Text className="text-igb-on-yellow font-semibold text-base">{title}</Text>}
    </View>
  )
}
