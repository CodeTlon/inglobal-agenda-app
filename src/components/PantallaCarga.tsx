import { useEffect } from 'react'
import { View, Image, StyleSheet } from 'react-native'
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
const LOGO = require('../../assets/images/splash-icon.png') as number
const SUAVE = Easing.bezier(0.22, 1, 0.36, 1)

/** Emblema con un anillo que se expande y se desvanece: el mismo en el velo entre secciones. */
function Emblema({ tamano }: { tamano: number }) {
  const anillo = useSharedValue(0)
  const entrada = useSharedValue(0)
  useEffect(() => {
    entrada.value = withTiming(1, { duration: 450, easing: SUAVE })
    anillo.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.cubic) }), -1)
  }, [entrada, anillo])
  const estiloAnillo = useAnimatedStyle(() => ({ opacity: (1 - anillo.value) * 0.5, transform: [{ scale: 0.95 + anillo.value * 0.55 }] }))
  const estiloEmblema = useAnimatedStyle(() => ({ opacity: entrada.value, transform: [{ scale: 0.9 + entrada.value * 0.1 }] }))
  const caja = tamano * 1.6
  return (
    <View style={{ width: caja, height: caja, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[{ position: 'absolute', width: tamano, height: tamano, borderRadius: tamano / 2, borderWidth: 2, borderColor: colors.yellow }, estiloAnillo]}
      />
      <Animated.View style={estiloEmblema}>
        <Image source={EMBLEMA} style={{ width: tamano, height: tamano }} resizeMode="contain" />
      </Animated.View>
    </View>
  )
}

/** Círculo grande de adorno: borde finito, casi invisible, que respira muy despacio detrás de la marca. */
function Aro({ diametro, opacidad, desplazamientoY }: { diametro: number; opacidad: number; desplazamientoY: number }) {
  const respira = useSharedValue(0)
  useEffect(() => {
    respira.value = withRepeat(
      withSequence(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 3200, easing: Easing.inOut(Easing.sin) })),
      -1,
    )
  }, [respira])
  const estilo = useAnimatedStyle(() => ({ transform: [{ scale: 1 + respira.value * 0.04 }] }))
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: diametro,
          height: diametro,
          borderRadius: diametro / 2,
          borderWidth: 1,
          borderColor: `rgba(245,209,0,${opacidad})`,
          transform: [{ translateY: desplazamientoY }],
        },
        estilo,
      ]}
    />
  )
}

/**
 * Pantalla de inicio: la marca "GRÚAS INGLOBAL" (logo oficial) bien grande, una línea de acento y "AGENDA" debajo.
 * Entra escalonada: logo, línea, subtítulo y barra. `listo` completa la barra y `fuentesListas` evita que
 * "AGENDA" se dibuje con la fuente del sistema antes de que cargue Manrope. El fondo es el mismo navy del splash
 * nativo, así que no hay destello al pasar de uno a otro.
 */
export function PantallaCarga({ listo, fuentesListas }: { listo: boolean; fuentesListas: boolean }) {
  const logo = useSharedValue(0)
  const linea = useSharedValue(0)
  const subtitulo = useSharedValue(0)
  const barra = useSharedValue(0)
  const cierre = useSharedValue(0)

  useEffect(() => {
    logo.value = withDelay(150, withTiming(1, { duration: 800, easing: SUAVE }))
    linea.value = withDelay(650, withTiming(1, { duration: 600, easing: SUAVE }))
    // La barra avanza hasta ~85 % mientras se carga; cuando todo está listo se completa (ver el otro efecto).
    barra.value = withDelay(400, withTiming(0.85, { duration: 1700, easing: Easing.out(Easing.cubic) }))
  }, [logo, linea, barra])

  useEffect(() => {
    if (fuentesListas) subtitulo.value = withDelay(800, withTiming(1, { duration: 600, easing: SUAVE }))
  }, [fuentesListas, subtitulo])

  useEffect(() => {
    if (listo) cierre.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) })
  }, [listo, cierre])

  const estiloLogo = useAnimatedStyle(() => ({ opacity: logo.value, transform: [{ scale: 0.92 + logo.value * 0.08 }, { translateY: (1 - logo.value) * 10 }] }))
  const estiloLinea = useAnimatedStyle(() => ({ width: linea.value * 64, opacity: linea.value }))
  const estiloSubtitulo = useAnimatedStyle(() => ({ opacity: subtitulo.value, transform: [{ translateY: (1 - subtitulo.value) * 10 }] }))
  // Dos valores a propósito: `barra` avanza sola hasta ~85 % y `cierre` completa el resto cuando todo está listo.
  const estiloBarra = useAnimatedStyle(() => ({ width: `${(barra.value + (1 - barra.value) * cierre.value) * 100}%` }))

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }]}>
      <Aro diametro={460} opacidad={0.14} desplazamientoY={40} />
      <Aro diametro={760} opacidad={0.08} desplazamientoY={40} />

      <Animated.View style={estiloLogo}>
        <Image source={LOGO} style={{ width: 310, height: 103 }} resizeMode="contain" />
      </Animated.View>
      <Animated.View style={[{ height: 3, borderRadius: 2, marginTop: 14, backgroundColor: colors.yellow }, estiloLinea]} />
      <Animated.Text
        style={[{ marginTop: 18, color: 'rgba(255,255,255,0.92)', fontFamily: 'Manrope_700Bold', fontSize: 22, letterSpacing: 9, textTransform: 'uppercase', paddingLeft: 9 }, estiloSubtitulo]}
      >
        Agenda
      </Animated.Text>

      <View style={{ position: 'absolute', bottom: 72, width: 120, height: 3, borderRadius: 2, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.18)' }}>
        <Animated.View style={[{ height: 3, borderRadius: 2, backgroundColor: colors.yellow }, estiloBarra]} />
      </View>
    </View>
  )
}

const MIN_VELO_MS = 420

/**
 * Velo entre secciones (Agenda, Catálogos, Perfil): tapa el cambio de pantalla, deja que las fotos se bajen al
 * caché y se va con un fundido. Muestra el nombre de la sección a la que se va. `abajo` deja visible la barra de tabs.
 */
export function VeloCarga({ abajo, etiqueta, onFin }: { abajo: number; etiqueta: string; onFin: () => void }) {
  const opacidad = useSharedValue(1)
  const texto = useSharedValue(0)
  useEffect(() => {
    texto.value = withDelay(120, withTiming(1, { duration: 400, easing: SUAVE }))
  }, [texto])
  useEffect(() => {
    let vivo = true
    const minimo = new Promise<void>((resolve) => setTimeout(resolve, MIN_VELO_MS))
    Promise.all([precargarFotos(), minimo]).then(() => {
      if (!vivo) return
      opacidad.value = withTiming(0, { duration: 320, easing: Easing.inOut(Easing.quad) }, (terminado) => terminado && runOnJS(onFin)())
    })
    return () => {
      vivo = false
    }
  }, [onFin, opacidad])
  const estilo = useAnimatedStyle(() => ({ opacity: opacidad.value }))
  const estiloTexto = useAnimatedStyle(() => ({ opacity: texto.value, transform: [{ translateY: (1 - texto.value) * 8 }] }))

  return (
    <Animated.View
      pointerEvents="auto"
      style={[
        { position: 'absolute', top: 0, left: 0, right: 0, bottom: abajo, zIndex: 50, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
        estilo,
      ]}
    >
      <Emblema tamano={104} />
      <Animated.Text
        style={[{ marginTop: -6, color: 'rgba(255,255,255,0.85)', fontFamily: 'Manrope_700Bold', fontSize: 14, letterSpacing: 5, textTransform: 'uppercase', paddingLeft: 5 }, estiloTexto]}
      >
        {etiqueta}
      </Animated.Text>
    </Animated.View>
  )
}
