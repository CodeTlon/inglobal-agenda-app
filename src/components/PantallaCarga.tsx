import { useEffect } from 'react'
import { View, Image, StyleSheet, Platform } from 'react-native'
import { requireOptionalNativeModule } from 'expo'
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
import { colors } from '@/lib/colors'
import { precargarFotos } from '@/lib/precarga'

const EMBLEMA = require('../../assets/images/android-icon-foreground.png') as number
const POSTER = require('../../assets/video/splash-poster.jpg') as number
// expo-video es un módulo nativo: un dev client o build anterior que no lo trae lanzaría "Cannot find native
// module 'ExpoVideo'" y tumbaría la app. Sin el módulo, el splash sigue sin video (mismo patrón que lib/notifications.ts).
// eslint-disable-next-line @typescript-eslint/no-require-imports -- carga condicional a propósito
const SplashVideo: (() => React.JSX.Element) | null = Platform.OS === 'web' || requireOptionalNativeModule('ExpoVideo') ? require('./SplashVideo').default : null
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

/**
 * Pantalla de inicio. Entra escalonada: el fondo (imagen fija y, si el binario trae `expo-video`, el video del hero
 * con fundido) se asienta con un zoom lento, después aparece el emblema, el título y la barra. `listo` completa la
 * barra y `fuentesListas` evita que el título se dibuje con la fuente del sistema antes de que cargue Manrope.
 * El fondo y el color base son el mismo navy del splash nativo, así que no hay destello al pasar de uno a otro.
 */
export function PantallaCarga({ listo, fuentesListas }: { listo: boolean; fuentesListas: boolean }) {
  const fondo = useSharedValue(0)
  const zoom = useSharedValue(0)
  const titulo = useSharedValue(0)
  const subtitulo = useSharedValue(0)
  const barra = useSharedValue(0)
  const cierre = useSharedValue(0)
  const aparece = useSharedValue(0)

  useEffect(() => {
    fondo.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) })
    zoom.value = withTiming(1, { duration: 3200, easing: Easing.out(Easing.cubic) })
    aparece.value = withDelay(500, withTiming(1, { duration: 500, easing: SUAVE }))
    // La barra avanza hasta ~85 % mientras se carga; cuando todo está listo se completa (ver el otro efecto).
    barra.value = withDelay(350, withTiming(0.85, { duration: 1700, easing: Easing.out(Easing.cubic) }))
  }, [fondo, zoom, aparece, barra])

  useEffect(() => {
    if (!fuentesListas) return
    titulo.value = withDelay(450, withTiming(1, { duration: 600, easing: SUAVE }))
    subtitulo.value = withDelay(650, withTiming(1, { duration: 600, easing: SUAVE }))
  }, [fuentesListas, titulo, subtitulo])

  useEffect(() => {
    if (listo) cierre.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) })
  }, [listo, cierre])

  const estiloFondo = useAnimatedStyle(() => ({ opacity: fondo.value, transform: [{ scale: 1.1 - zoom.value * 0.1 }] }))
  const estiloEmblema = useAnimatedStyle(() => ({ opacity: aparece.value }))
  const estiloTitulo = useAnimatedStyle(() => ({ opacity: titulo.value, transform: [{ translateY: (1 - titulo.value) * 14 }] }))
  const estiloSubtitulo = useAnimatedStyle(() => ({ opacity: subtitulo.value, transform: [{ translateY: (1 - subtitulo.value) * 10 }] }))
  // Dos valores a propósito: `barra` avanza sola hasta ~85 % y `cierre` completa el resto cuando todo está listo.
  const estiloBarra = useAnimatedStyle(() => ({ width: `${(barra.value + (1 - barra.value) * cierre.value) * 100}%` }))

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }]}>
      <Animated.View style={[StyleSheet.absoluteFill, estiloFondo]}>
        <Image source={POSTER} style={StyleSheet.absoluteFill} resizeMode="cover" />
        {SplashVideo && <SplashVideo />}
      </Animated.View>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,40,100,0.84)' }]} />

      <Animated.View style={estiloEmblema}>
        <Emblema tamano={150} />
      </Animated.View>
      <Animated.Text style={[{ marginTop: 6, color: colors.yellow, fontFamily: 'Manrope_700Bold', fontSize: 30, letterSpacing: 2, textAlign: 'center' }, estiloTitulo]}>
        GRÚAS INGLOBAL
      </Animated.Text>
      <Animated.Text style={[{ marginTop: 2, color: 'rgba(255,255,255,0.85)', fontSize: 13, letterSpacing: 6, textTransform: 'uppercase' }, estiloSubtitulo]}>
        Agenda
      </Animated.Text>
      <View style={{ width: 120, height: 3, borderRadius: 2, marginTop: 28, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.18)' }}>
        <Animated.View style={[{ height: 3, borderRadius: 2, backgroundColor: colors.yellow }, estiloBarra]} />
      </View>
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
