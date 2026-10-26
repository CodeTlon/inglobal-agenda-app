import { useEffect } from 'react'
import { View, Image, Text, StyleSheet } from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { useVideoPlayer, VideoView } from 'expo-video'
import { colors } from '@/lib/colors'
import { precargarFotos } from '@/lib/precarga'

const EMBLEMA = require('../../assets/images/android-icon-foreground.png') as number
// Mismo video del hero del sitio, recortado a 6 s y comprimido (ver docs/deployment.md).
const VIDEO = require('../../assets/video/splash.mp4') as number
const SUAVE = Easing.bezier(0.22, 1, 0.36, 1)

/** Emblema con un halo que respira: el mismo en la pantalla de inicio y en el velo entre secciones. */
function Emblema({ tamano }: { tamano: number }) {
  const halo = useSharedValue(0)
  const entrada = useSharedValue(0)
  useEffect(() => {
    entrada.value = withTiming(1, { duration: 500, easing: SUAVE })
    halo.value = withRepeat(
      withSequence(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.sin) })),
      -1,
    )
  }, [entrada, halo])
  const estiloHalo = useAnimatedStyle(() => ({ opacity: 0.55 - halo.value * 0.45, transform: [{ scale: 0.86 + halo.value * 0.2 }] }))
  const estiloEmblema = useAnimatedStyle(() => ({ opacity: entrada.value, transform: [{ scale: 0.92 + entrada.value * 0.08 }] }))
  const caja = tamano * 1.5
  return (
    <View style={{ width: caja, height: caja, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ position: 'absolute', width: caja, height: caja, borderRadius: caja / 2, borderWidth: 2, borderColor: colors.yellow }, estiloHalo]} />
      <Animated.View style={estiloEmblema}>
        <Image source={EMBLEMA} style={{ width: tamano, height: tamano }} resizeMode="contain" />
      </Animated.View>
    </View>
  )
}

/** Pantalla de inicio: video del hero de fondo bajo un velo navy, emblema, logo, barra de progreso y el crédito de CodeTlon. */
export function PantallaCarga() {
  const barra = useSharedValue(0)
  useEffect(() => {
    barra.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.cubic) }), -1)
  }, [barra])
  const estiloBarra = useAnimatedStyle(() => ({ left: `${barra.value * 100 - 30}%`, width: '30%' }))
  const player = useVideoPlayer(VIDEO, (p) => {
    p.loop = true
    p.muted = true
    p.play()
  })

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }]}>
      <View style={StyleSheet.absoluteFill}>
        <VideoView player={player} contentFit="cover" nativeControls={false} allowsPictureInPicture={false} style={{ width: '100%', height: '100%' }} />
      </View>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,40,100,0.84)' }]} />
      <Emblema tamano={150} />
      <Text style={{ marginTop: 6, color: colors.yellow, fontFamily: 'Manrope_700Bold', fontSize: 30, letterSpacing: 2, textAlign: 'center' }}>GRÚAS INGLOBAL</Text>
      <Text style={{ marginTop: 2, color: 'rgba(255,255,255,0.85)', fontSize: 13, letterSpacing: 6, textTransform: 'uppercase' }}>Agenda</Text>
      <View style={{ width: 120, height: 3, borderRadius: 2, marginTop: 28, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.18)' }}>
        <Animated.View style={[{ position: 'absolute', height: 3, borderRadius: 2, backgroundColor: colors.yellow }, estiloBarra]} />
      </View>
      <Text style={{ position: 'absolute', bottom: 40, color: 'rgba(255,255,255,0.6)', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' }}>
        Desarrollado por CodeTlon
      </Text>
    </View>
  )
}

const MIN_VELO_MS = 450

/**
 * Velo entre secciones (Agenda, Catálogos, Perfil): tapa el cambio de pantalla, deja que las fotos se
 * bajen al caché y se va. `abajo` deja visible la barra de tabs.
 */
export function VeloCarga({ abajo, onFin }: { abajo: number; onFin: () => void }) {
  const opacidad = useSharedValue(1)
  useEffect(() => {
    let vivo = true
    const minimo = new Promise<void>((resolve) => setTimeout(resolve, MIN_VELO_MS))
    Promise.all([precargarFotos(), minimo]).then(() => {
      if (!vivo) return
      opacidad.value = withDelay(0, withTiming(0, { duration: 250 }, (terminado) => terminado && runOnJS(onFin)()))
    })
    return () => {
      vivo = false
    }
  }, [onFin, opacidad])
  const estilo = useAnimatedStyle(() => ({ opacity: opacidad.value }))

  return (
    <Animated.View
      pointerEvents="auto"
      style={[
        { position: 'absolute', top: 0, left: 0, right: 0, bottom: abajo, zIndex: 50, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
        estilo,
      ]}
    >
      <Emblema tamano={120} />
    </Animated.View>
  )
}
