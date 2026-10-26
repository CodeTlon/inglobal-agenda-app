import { View, StyleSheet } from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'

// Mismo video del hero del sitio, recortado a 6 s y comprimido (ver docs/deployment.md).
const VIDEO = require('../../assets/video/splash.mp4') as number

/** Video de fondo del splash. Vive aparte para que PantallaCarga lo cargue solo si el binario trae `expo-video`. */
export default function SplashVideo() {
  const player = useVideoPlayer(VIDEO, (p) => {
    p.loop = true
    p.muted = true
    p.play()
  })
  return (
    <View style={StyleSheet.absoluteFill}>
      <VideoView player={player} contentFit="cover" nativeControls={false} allowsPictureInPicture={false} style={{ width: '100%', height: '100%' }} />
    </View>
  )
}
