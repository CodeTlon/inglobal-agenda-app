import { useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'
import { useEvent } from 'expo'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

// Mismo video del hero del sitio, recortado a 6 s y comprimido (ver docs/deployment.md).
const VIDEO = require('../../assets/video/splash.mp4') as number

/**
 * Video de fondo del splash. Vive aparte para que PantallaCarga lo cargue solo si el binario trae `expo-video`.
 * Entra con un fundido recién cuando tiene su primer cuadro: hasta entonces se ve la imagen fija de abajo, así
 * no hay un hueco negro ni un salto cuando el video arranca.
 */
export default function SplashVideo() {
  const player = useVideoPlayer(VIDEO, (p) => {
    p.loop = true
    p.muted = true
    p.play()
  })
  const { status } = useEvent(player, 'statusChange', { status: player.status })
  const opacidad = useSharedValue(0)
  useEffect(() => {
    if (status === 'readyToPlay') opacidad.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) })
  }, [status, opacidad])
  const estilo = useAnimatedStyle(() => ({ opacity: opacidad.value }))

  return (
    <Animated.View style={[StyleSheet.absoluteFill, estilo]}>
      <View style={StyleSheet.absoluteFill}>
        <VideoView player={player} contentFit="cover" nativeControls={false} allowsPictureInPicture={false} style={{ width: '100%', height: '100%' }} />
      </View>
    </Animated.View>
  )
}
