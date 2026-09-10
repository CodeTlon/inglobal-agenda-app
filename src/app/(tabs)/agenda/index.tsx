import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, ScrollView, Pressable, ActivityIndicator, useWindowDimensions } from 'react-native'
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from 'react-native-reanimated'
import { useFocusEffect, useRouter } from 'expo-router'
import { Text } from '@/components/Text'
import { getEventosAgendaCached } from '@/lib/agenda-api'
import { ApiError } from '@/lib/api'
import {
  getWeekStart,
  getWeekDays,
  addDays,
  toDateInput,
  estadoStripColor,
  estadoColorClassesLight,
  layoutDayEvents,
  formatEstado,
  getEstadoVisual,
  cruzaMedianoche,
  finDiaEfectivo,
  finDiaEfectivoEvento,
} from '@/lib/agenda-view'
import type { EventoAgenda } from '@/lib/types'
import { EstadoLegend } from '@/components/EstadoLegend'
import { AgendaMonthView } from '@/components/agenda/AgendaMonthView'
import { AgendaWeekView } from '@/components/agenda/AgendaWeekView'
import { colors } from '@/lib/colors'
import { useNavThrottle } from '@/lib/useNavThrottle'

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const PX_PER_HOUR = 60
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAY_HEIGHT = 24 * PX_PER_HOUR
const MIN_CARD_HEIGHT = 44
// Ventana de días renderizada como una única lista continua: bajar de un día
// a otro es scroll normal, no un salto de pantalla. La ventana arranca con
// este tamaño y crece sola (ver `extend`) al acercarse al borde del scroll,
// para atrás o para adelante, sin techo.
const INITIAL_BEFORE = 7
const INITIAL_AFTER = 23
const EXTEND_CHUNK = 14
const EDGE_TRIGGER = DAY_HEIGHT * 3
// Techo del árbol montado: sin esto `extend` solo sumaba días y nunca
// achicaba, así que con uso normal (scrollear bastante ida y vuelta) el
// ScrollView terminaba con meses de días sin virtualizar montados a la vez,
// degradando el scroll con el tiempo.
const MAX_MOUNTED_DAYS = 90

function toMinutes(hhmmss: string): number {
  const [h, m] = hhmmss.split(':').map(Number)
  return h * 60 + m
}
function nowMinutes(): number {
  const n = new Date()
  return n.getHours() * 60 + n.getMinutes()
}
function eventoOcurreEn(ev: EventoAgenda, fecha: string): boolean {
  // finDiaEfectivoEvento (no `fecha_hasta ?? fecha`): un turno nocturno sin
  // fecha_hasta (22:00→02:00) sigue vigente al día siguiente — con el bound
  // viejo el timeline de Día, el conteo de la píldora y el scroll-height
  // nunca lo contaban en esa columna.
  return ev.fecha <= fecha && fecha <= finDiaEfectivoEvento(ev)
}

type Positioned = { key: string; ev: EventoAgenda; top: number; height: number; lane: number; lanes: number }

export default function AgendaScreen() {
  const router = useRouter()
  const { width: screenWidth } = useWindowDimensions()
  // Mes es la vista por defecto; Semana es un nivel intermedio; Día es el
  // timeline horario de siempre, sin cambios funcionales, alcanzable por tap.
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month')
  const [days, setDays] = useState(() =>
    Array.from({ length: INITIAL_BEFORE + INITIAL_AFTER + 1 }, (_, i) => addDays(new Date(), i - INITIAL_BEFORE)),
  )
  const [focused, setFocused] = useState(() => new Date()) // día resaltado en el header, sigue el scroll
  const canNavWeek = useNavThrottle()
  const [eventos, setEventos] = useState<EventoAgenda[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // `todayStr`/`nowMinutes()` se recalculan con `new Date()` en cada render,
  // pero sin esto nada dispara ese render — el resaltado de "hoy" y la línea
  // roja de "ahora" se quedaban pegados hasta que otra cosa (foco, scroll)
  // forzara un render, a veces horas después de medianoche.
  const [, forceTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])
  const timelineRef = useRef<ScrollView>(null)
  const scrollYRef = useRef(0)
  const extendingRef = useRef<'past' | 'future' | null>(null)
  // Mientras un scrollTo animado está en vuelo, onScroll dispara en cada frame
  // intermedio con offsets que todavía no llegaron al destino — sin esta guarda,
  // ese onScroll pisaba el `focused` correcto que goTo ya había seteado (bug:
  // tocar un día vecino lo mostraba resaltado un instante y volvía al elegido;
  // en semana, 7x la distancia, el "rebote" se notaba mucho más).
  const isProgrammaticScrollRef = useRef(false)
  const programmaticScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Objetivo en px del scroll programático en vuelo — permite limpiar la guarda
  // en cuanto onScroll reporta que ya llegamos, en vez de confiar a ciegas en
  // el timeout (que en Android puede vencer antes de que termine un scroll
  // largo, ver `scrollToDate`).
  const scrollTargetYRef = useRef<number | null>(null)
  const daysRef = useRef(days)
  daysRef.current = days
  const pendingScrollRef = useRef<{ dateStr: string; animated: boolean } | null>({
    dateStr: toDateInput(new Date()),
    animated: false,
  })

  const windowStart = days[0]
  const windowEnd = days[days.length - 1]
  const focusedStr = toDateInput(focused)
  const todayStr = toDateInput(new Date())
  const todayIdx = days.findIndex((d) => toDateInput(d) === todayStr)
  const weekStart = getWeekStart(focused)
  const weekDays = getWeekDays(weekStart)

  // Swipe horizontal en Mes/Semana: cambia de período (no de nivel de zoom,
  // eso es tap en un día + botón "volver" en el header de cada vista, para no
  // pelear por el mismo eje con la navegación de fecha). Día mantiene su
  // propio scroll vertical sin gesto horizontal nuevo.
  const translateX = useSharedValue(0)
  const animatedViewStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }))

  function goToPrevPeriod() {
    setFocused((f) => (viewMode === 'month' ? new Date(f.getFullYear(), f.getMonth() - 1, 1) : addDays(f, -7)))
  }
  function goToNextPeriod() {
    setFocused((f) => (viewMode === 'month' ? new Date(f.getFullYear(), f.getMonth() + 1, 1) : addDays(f, 7)))
  }

  // Antes: al terminar el withTiming se saltaba translateX a 0 Y se pedía el
  // cambio de foco en el mismo instante — como runOnJS cruza al JS thread de
  // forma asíncrona, quedaba un hueco (contenido viejo ya afuera, nuevo
  // todavía sin montar) justo cuando el usuario esperaba ver el período
  // siguiente. Ahora el salto a 0 pasa a ser un salto al lado OPUESTO (sin
  // animar) hecho junto con el cambio de foco, y recién ahí se anima de
  // vuelta a 0 — el contenido nuevo entra deslizándose en vez de aparecer de
  // golpe. Se usa tanto para el gesto como para los botones ‹› (antes esos
  // botones cambiaban de foco sin ninguna animación).
  function runNav(direction: 'next' | 'prev') {
    'worklet'
    // Se llama tanto desde JS thread (botones ‹›) como desde el worklet de
    // panGesture.onEnd (UI thread) — sin el directive de arriba, la segunda
    // llamada crashea (una función JS común no se puede invocar dentro de
    // un worklet sin pasar por runOnJS).
    const sign = direction === 'next' ? -1 : 1
    translateX.value = withTiming(sign * screenWidth, { duration: 150 }, (finished) => {
      if (!finished) return
      translateX.value = -sign * screenWidth
      // runOnJS necesita una referencia directa a la función, no un
      // ternario armado adentro del call — con el ternario el plugin de
      // worklets no lo resuelve bien y crashea en nativo.
      if (direction === 'next') {
        runOnJS(goToNextPeriod)()
      } else {
        runOnJS(goToPrevPeriod)()
      }
      translateX.value = withTiming(0, { duration: 150 })
    })
  }

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX
    })
    .onEnd((e) => {
      const committed = e.translationX < -screenWidth * 0.25 || e.velocityX < -800
        ? 'next'
        : e.translationX > screenWidth * 0.25 || e.velocityX > 800
          ? 'prev'
          : null
      if (committed) {
        runNav(committed)
      } else {
        translateX.value = withSpring(0)
      }
    })

  // `cached` reutiliza eventos que Mes/Semana ya hayan traído para ese rango
  // (evita el refetch al pasar a semana/día).
  async function fetchEventos(desde: string, hasta: string): Promise<EventoAgenda[]> {
    try {
      return await getEventosAgendaCached(desde, hasta)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar los eventos. Revisá tu conexión.')
      return []
    }
  }

  // Refetch completo de toda la ventana visible al volver a la pantalla. No
  // depende de `days` (usa el ref) para no reejecutarse cada vez que
  // `extend` hace crecer la ventana mientras scrolleás — solo en focus real.
  const load = useCallback(() => {
    setError(null)
    const d = daysRef.current
    const from = toDateInput(d[0])
    const to = toDateInput(d[d.length - 1])
    fetchEventos(from, to).then((data) => {
      setLoading(false)
      hasLoadedOnceRef.current = true
      // Si mientras esperaba esta respuesta se pidió una ventana distinta
      // (ej. goTo saltando a un día fuera de lo cargado, que arma la suya
      // propia y hace su propio fetch — ver el comentario de más abajo sobre
      // por qué este mismo load() se dispara también al entrar a Día desde
      // Semana), esta respuesta quedó vieja: aplicarla pisaría los eventos
      // correctos (los que goTo ya trajo) con los de la ventana anterior.
      // Se descarta solo esto — loading/hasLoadedOnceRef igual se actualizan
      // arriba, no hay que esperar a nadie más para eso.
      const current = daysRef.current
      if (toDateInput(current[0]) !== from || toDateInput(current[current.length - 1]) !== to) return
      setEventos(data)
    })
  }, [])

  // Bug: useFocusEffect disparaba setLoading(true) en CADA foco de pantalla,
  // no solo la primera vez. Como el ScrollView solo se monta cuando
  // !loading, volver de crear/editar un evento desmontaba el ScrollView y lo
  // volvía a montar de cero — perdiendo la posición de scroll (arrancaba
  // arriba del todo de la ventana cargada, no en el día que estabas mirando).
  // Solo mostramos el spinner de pantalla completa la primera vez; los
  // refetches por refoco pasan en silencio con el ScrollView ya montado.
  //
  // ponytail: solo Día usa este `eventos`/`loading` de 31 días — Mes y
  // Semana traen el suyo (AgendaMonthView/AgendaWeekView). Antes se pedía
  // siempre, en cada foco de la pestaña, aunque se estuviera mirando Mes:
  // un fetch entero tirado a la basura en paralelo con el que sí se usaba.
  // El chequeo de `viewMode` en el dep array hace que este mismo hook
  // recargue también al entrar a Día desde Semana (useFocusEffect vuelve a
  // correr cuando cambia el callback memoizado, sin esperar un foco real) —
  // como contrapartida, la primera vez que se entra a Día en la sesión el
  // scroll inicial ancla en las 07:00/ahora en vez del primer evento real
  // (todavía no llegó el fetch): cosmético, se corrige solo al re-entrar.
  const hasLoadedOnceRef = useRef(false)
  useFocusEffect(
    useCallback(() => {
      if (viewMode !== 'day') return
      if (!hasLoadedOnceRef.current) setLoading(true)
      load()
    }, [load, viewMode]),
  )

  // Reintenta entregar el scroll pendiente cada vez que `loading` cambia —
  // proxy de "puede que el ScrollView acabe de montar". flushPendingScroll
  // no hace nada si no está listo todavía (vuelve a intentarse en el
  // próximo cambio, o en el siguiente goTo/navigateToDay).
  useEffect(() => {
    flushPendingScroll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  function armPendingScroll(date: Date, animated: boolean) {
    pendingScrollRef.current = { dateStr: toDateInput(date), animated }
  }

  // Entrega pendingScrollRef si el ScrollView ya está montado. Se fija en
  // timelineRef.current, no en `loading` — `loading` puede ya estar en
  // `false` con el ScrollView igual sin montar (rama de error), y ahí un
  // scrollTo sería un no-op silencioso que además pierde el pendiente sin
  // dejar rastro. Si no está listo, no hace nada: la próxima vez que
  // `loading` cambie (efecto de arriba) o que se llame a goTo de nuevo, se
  // reintenta con el mismo destino, todavía guardado en el ref.
  function flushPendingScroll(daysList: Date[] = days, eventosList: EventoAgenda[] = eventos) {
    if (!timelineRef.current || !pendingScrollRef.current) return
    const { dateStr, animated } = pendingScrollRef.current
    // Confirma que el día pedido esté en ESTA ventana antes de dar por
    // entregado el pendiente — si no, scrollToDate no encuentra el índice y
    // no hace nada (ver más abajo), pero ya lo habríamos limpiado del ref
    // sin haber scrolleado a ningún lado. Puede pasar si el `[loading]` de
    // abajo dispara con la ventana vieja (ver el comentario en load() sobre
    // la respuesta descartada) antes de que goTo llegue a armar la ventana
    // nueva que sí lo contiene — dejarlo intacto acá permite que ese goTo,
    // un frame después, lo entregue bien.
    if (!daysList.some((d) => toDateInput(d) === dateStr)) return
    pendingScrollRef.current = null
    scrollToDate(dateStr, animated, daysList, eventosList)
  }

  // `daysList`/`eventosList` son opcionales para poder scrollear a un destino
  // recién calculado (días/eventos de una ventana nueva) antes de que ese
  // estado termine de aplicarse — evita depender del closure viejo de `days`.
  function scrollToDate(dateStr: string, animated: boolean, daysList: Date[] = days, eventosList: EventoAgenda[] = eventos) {
    const idx = daysList.findIndex((d) => toDateInput(d) === dateStr)
    if (idx === -1) return
    const eventosDelDia = eventosList.filter((ev) => eventoOcurreEn(ev, dateStr))
    const anchorMin = eventosDelDia.length > 0
      ? Math.min(...eventosDelDia.map((ev) => toMinutes(ev.hora_inicio)))
      : dateStr === todayStr ? nowMinutes() : 7 * 60
    const y = idx * DAY_HEIGHT + Math.max(0, (anchorMin / 60 - 1) * PX_PER_HOUR)
    // La guarda se arma siempre, sea o no animado el salto — `animated` solo
    // controla si el ScrollView nativo lo anima, es independiente de si
    // `handleScroll` debe ignorar el evento resultante. Antes solo se armaba
    // `if (animated)`: un salto sin animar (el de `goTo` al reconstruir la
    // ventana) quedaba sin protección y `handleScroll` lo procesaba como
    // scroll real del usuario contra un `days` todavía viejo — aterrizaba
    // ~16 días lejos del destino real (bug: "salta de un día a otro sin
    // relación").
    isProgrammaticScrollRef.current = true
    scrollTargetYRef.current = y
    if (programmaticScrollTimeoutRef.current) clearTimeout(programmaticScrollTimeoutRef.current)
    // Red de seguridad si por lo que sea no llega ni onMomentumScrollEnd ni
    // el chequeo de proximidad en handleScroll. Proporcional a la distancia:
    // un salto de semana recorre ~7x los px de un salto de día y en Android
    // el scroll nativo tarda más — un timeout fijo corto lo cortaba a mitad
    // de camino (bug: "vuelve al día inicial y después salta").
    const distance = Math.abs(y - scrollYRef.current)
    const timeoutMs = Math.min(3000, 400 + distance / 4)
    programmaticScrollTimeoutRef.current = setTimeout(() => {
      isProgrammaticScrollRef.current = false
      scrollTargetYRef.current = null
    }, timeoutMs)
    timelineRef.current?.scrollTo({ y, animated })
  }

  function clearProgrammaticScroll() {
    if (programmaticScrollTimeoutRef.current) {
      clearTimeout(programmaticScrollTimeoutRef.current)
      programmaticScrollTimeoutRef.current = null
    }
    isProgrammaticScrollRef.current = false
    scrollTargetYRef.current = null
  }

  // Navegación explícita (flechas de semana, tap en un día). Si el destino ya
  // está entre los días renderizados, solo scrollea — sin refetch ni
  // parpadeo. Si está más lejos de lo que se llegó a renderizar scrolleando,
  // arma una ventana nueva centrada ahí (esto sí es un salto, pero es a
  // pedido explícito, no arrastrando el dedo).
  function goTo(date: Date, animated = true) {
    setFocused(date)
    if (date >= windowStart && date <= windowEnd) {
      armPendingScroll(date, animated)
      // flushPendingScroll no hace nada si el ScrollView todavía no está
      // montado (ej. primera vez que se entra a Día en la sesión) — en ese
      // caso queda armado y lo entrega el efecto de arriba apenas monte.
      flushPendingScroll()
      return
    }
    // Destino fuera de la ventana renderizada: arma una ventana nueva sin
    // pasar por el spinner de pantalla completa (eso desmontaba el ScrollView
    // y lo remontaba en y=0, mostrando el primer día de la ventana nueva antes
    // de deslizar al elegido — el otro tramo del bug "vuelve y después
    // salta"). El ScrollView sigue montado con el contenido viejo mientras
    // carga; recién cuando `days`/`eventos` ya están puestos, un scroll NO
    // animado en el próximo frame (mismo patrón que `extend`) salta directo
    // al destino sin exponer un frame con offset viejo sobre contenido nuevo.
    // animated:false siempre acá (aunque venga true): cruzar a una ventana
    // nueva ya es un salto por diseño, no tiene sentido animarlo.
    armPendingScroll(date, false)
    const newDays = Array.from({ length: INITIAL_BEFORE + INITIAL_AFTER + 1 }, (_, i) => addDays(date, i - INITIAL_BEFORE))
    setDays(newDays)
    fetchEventos(toDateInput(newDays[0]), toDateInput(newDays[newDays.length - 1])).then((data) => {
      setEventos(data)
      requestAnimationFrame(() => flushPendingScroll(newDays, data))
    })
  }

  // Único punto de entrada para saltar a Día desde OTRA vista (Semana). El
  // pendingScroll se arma ACÁ, sincrónico — no alcanza con dejárselo a goTo,
  // que recién corre un frame después (rAF, para que el ScrollView de Día
  // llegue a montar tras el cambio de viewMode): cambiar viewMode también
  // dispara el useFocusEffect de más arriba (load(), por el
  // `[load, viewMode]` en sus dependencias), y si esos eventos ya están en
  // cache esa promesa resuelve casi sincrónico — loading pasa a `false`
  // ANTES de que goTo llegue a ejecutarse, y el efecto que consume
  // pendingScrollRef dispara con lo que hubiera ahí en ese momento (el "ir a
  // hoy" del mount, si es la primera vez que se entra a Día en la sesión).
  // Armándolo acá primero, gane quien gane esa carrera, apunta al día
  // correcto. Cualquier futura forma de saltar a un día desde afuera de esta
  // vista debería pasar por acá, no reimplementar el mismo tejido a mano.
  function navigateToDay(date: Date) {
    armPendingScroll(date, false)
    setViewMode('day')
    requestAnimationFrame(() => goTo(date, false))
  }

  // Scroll infinito: al acercarse a cualquiera de los dos bordes de lo ya
  // renderizado, suma más días de ese lado (sin tocar el otro extremo). Para
  // atrás hay que compensar el scroll — el contenido de arriba creció, así
  // que sin corregir la posición la pantalla "saltaría" para abajo.
  async function extend(direction: 'past' | 'future') {
    if (extendingRef.current) return
    extendingRef.current = direction
    const chunk = Array.from({ length: EXTEND_CHUNK }, (_, i) =>
      direction === 'future' ? addDays(windowEnd, i + 1) : addDays(windowStart, i - EXTEND_CHUNK),
    )
    const data = await fetchEventos(toDateInput(chunk[0]), toDateInput(chunk[chunk.length - 1]))
    // Un evento con fecha_hasta que cruza el borde entre la ventana ya
    // cargada y este chunk nuevo viene en AMBOS fetches (el overlap-test de
    // agenda-api.ts así lo garantiza) — sin dedupe por id quedaba duplicado
    // (una card de más por cada día de su rango) hasta el próximo refoco.
    setEventos((prev) => {
      const yaEstan = new Set(prev.map((ev) => ev.id))
      return [...prev, ...data.filter((ev) => !yaEstan.has(ev.id))]
    })
    if (direction === 'past') {
      // Mismo bug de fondo que scrollToDate ya sufrió ("salta de un día a
      // otro sin relación"): si `days` se actualiza antes de armar la
      // guarda, un scroll real que llegue entre el setDays y el
      // requestAnimationFrame usa el offset viejo contra el array ya
      // extendido — handleScroll calcula un día EXTEND_CHUNK (2 semanas) más
      // atrás del real. Armar la guarda ANTES de tocar `days` cierra la
      // ventana.
      const y = scrollYRef.current + EXTEND_CHUNK * DAY_HEIGHT
      isProgrammaticScrollRef.current = true
      scrollTargetYRef.current = y
      if (programmaticScrollTimeoutRef.current) clearTimeout(programmaticScrollTimeoutRef.current)
      const distance = Math.abs(y - scrollYRef.current)
      const timeoutMs = Math.min(3000, 400 + distance / 4)
      programmaticScrollTimeoutRef.current = setTimeout(() => {
        isProgrammaticScrollRef.current = false
        scrollTargetYRef.current = null
      }, timeoutMs)
      // El extremo futuro recortado acá siempre queda lejos del scroll (que
      // está ahora arriba, contra el borde `past`) — no hace falta compensar
      // offset, solo no dejar crecer el array de por vida.
      setDays((prev) => {
        const next = [...chunk, ...prev]
        return next.length > MAX_MOUNTED_DAYS ? next.slice(0, MAX_MOUNTED_DAYS) : next
      })
      requestAnimationFrame(() => {
        timelineRef.current?.scrollTo({ y, animated: false })
      })
    } else {
      const overflow = days.length + EXTEND_CHUNK - MAX_MOUNTED_DAYS
      if (overflow > 0) {
        // Simétrico al caso 'past': recortar el extremo viejo (arriba) corre
        // todo lo de abajo esa altura — armar la guarda de scroll ANTES de
        // tocar `days`, mismo motivo que arriba.
        const y = scrollYRef.current - overflow * DAY_HEIGHT
        isProgrammaticScrollRef.current = true
        scrollTargetYRef.current = y
        if (programmaticScrollTimeoutRef.current) clearTimeout(programmaticScrollTimeoutRef.current)
        const distance = Math.abs(y - scrollYRef.current)
        const timeoutMs = Math.min(3000, 400 + distance / 4)
        programmaticScrollTimeoutRef.current = setTimeout(() => {
          isProgrammaticScrollRef.current = false
          scrollTargetYRef.current = null
        }, timeoutMs)
        setDays((prev) => [...prev, ...chunk].slice(overflow))
        requestAnimationFrame(() => {
          timelineRef.current?.scrollTo({ y, animated: false })
        })
      } else {
        setDays((prev) => [...prev, ...chunk])
      }
    }
    extendingRef.current = null
  }

  // Qué día está centrado en el scroll actual, para resaltar el header — no
  // mueve el scroll, la lista ya es continua. También dispara `extend`
  // cuando el scroll se acerca a un borde de lo renderizado.
  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent
    scrollYRef.current = contentOffset.y
    // Llegamos (o pasamos de largo) el destino del scroll programático: no
    // hace falta esperar el timeout de red de seguridad para soltar la
    // guarda, así el próximo scroll real del usuario no se ignora de más.
    if (isProgrammaticScrollRef.current && scrollTargetYRef.current !== null
      && Math.abs(contentOffset.y - scrollTargetYRef.current) < 8) {
      clearProgrammaticScroll()
    }
    if (!isProgrammaticScrollRef.current) {
      const idx = Math.min(days.length - 1, Math.max(0, Math.round(contentOffset.y / DAY_HEIGHT)))
      const d = days[idx]
      setFocused((prev) => (toDateInput(prev) === toDateInput(d) ? prev : d))

      // Gateado por la misma guarda: si no, un `goTo` animado que pasa cerca
      // de un borde dispara `extend` a mitad de vuelo, y el scroll no animado
      // que compensa la extensión compite con el scrollTo de `goTo` en curso
      // — otro salto visible además del que ya arregla la guarda de arriba.
      if (contentOffset.y < EDGE_TRIGGER) extend('past')
      else if (contentOffset.y + layoutMeasurement.height > contentSize.height - EDGE_TRIGGER) extend('future')
    }
  }

  // Conteos del día enfocado para el summary strip — mismos 3 grupos que la
  // franja lateral/chip de estado ya usan (getEstadoVisual), sin fetch nuevo.
  const focusedCounts = useMemo(() => {
    const delDia = eventos.filter((ev) => eventoOcurreEn(ev, focusedStr))
    return {
      enCurso: delDia.filter((ev) => getEstadoVisual(ev) === 'en_curso').length,
      confirmados: delDia.filter((ev) => getEstadoVisual(ev) === 'programado').length,
      pendientes: delDia.filter((ev) => getEstadoVisual(ev) === 'reserva').length,
    }
  }, [eventos, focusedStr])

  // Un evento con fecha_hasta ocupa la MISMA ventana horaria [hora_inicio, hora_fin)
  // cada día del rango (igual que getEstadoVisual) — acá se arma un segmento por día
  // en vez de una sola card continua de punta a punta, que tapaba también las noches
  // y madrugadas intermedias y se sentía como una columna sin fin. Cuando la ventana
  // en sí cruza medianoche (hora_fin <= hora_inicio, turno nocturno) es siempre una
  // sola card continua de punta a punta hasta finDiaEfectivo — mismo criterio que
  // getEstadoVisual — tenga o no fecha_hasta puesta.
  const positioned = useMemo<Positioned[]>(() => {
    const dayIndex = new Map(days.map((d, i) => [toDateInput(d), i]))
    const windowStartStr = toDateInput(windowStart)
    const windowEndStr = toDateInput(windowEnd)
    const relevant = eventos.filter((ev) => finDiaEfectivoEvento(ev) >= windowStartStr && ev.fecha <= windowEndStr)

    const segments: { ev: EventoAgenda; dayStr: string; horaInicio: string; horaFin: string; crossesMidnight: boolean; finDia: string }[] = []
    for (const ev of relevant) {
      const horaFinEfectiva = ev.hora_fin ?? '18:00'
      if (cruzaMedianoche(ev.fecha, ev.fecha_hasta, ev.hora_inicio, horaFinEfectiva)) {
        const finDia = finDiaEfectivo(ev.fecha, ev.fecha_hasta, ev.hora_inicio, horaFinEfectiva)
        segments.push({ ev, dayStr: ev.fecha, horaInicio: ev.hora_inicio, horaFin: horaFinEfectiva, crossesMidnight: true, finDia })
        continue
      }
      const ultimoDia = ev.fecha_hasta ?? ev.fecha
      for (const d of days) {
        const dStr = toDateInput(d)
        if (dStr < ev.fecha || dStr > ultimoDia) continue
        segments.push({ ev, dayStr: dStr, horaInicio: ev.hora_inicio, horaFin: horaFinEfectiva, crossesMidnight: false, finDia: dStr })
      }
    }

    const withKeys = segments.map((s) => ({
      ...s,
      hora_inicio: `${s.dayStr}T${s.horaInicio}`,
      hora_fin: `${s.finDia}T${s.horaFin}`,
    }))
    const layout = layoutDayEvents(withKeys)
    return withKeys.map((s) => {
      const slot = layout.get(s)!
      const startMin = toMinutes(s.horaInicio)
      const endMin = toMinutes(s.horaFin)
      const dayIdx = dayIndex.get(s.dayStr) ?? 0
      // Días entre el inicio del segmento y finDia (0 salvo cruce de medianoche,
      // 1 para una sola noche, más si fecha_hasta cae varios días después).
      const diasHastaFin = s.crossesMidnight
        ? Math.round((new Date(`${s.finDia}T00:00:00`).getTime() - new Date(`${s.dayStr}T00:00:00`).getTime()) / 86400000)
        : 0
      const endDayIdx = dayIdx + diasHastaFin
      const top = Math.max(0, dayIdx * DAY_HEIGHT + (startMin / 60) * PX_PER_HOUR)
      const bottom = Math.min(days.length * DAY_HEIGHT, endDayIdx * DAY_HEIGHT + (endMin / 60) * PX_PER_HOUR)
      return { key: `${s.ev.id}-${s.dayStr}`, ev: s.ev, top, height: Math.max(bottom - top, MIN_CARD_HEIGHT), lane: slot.lane, lanes: slot.lanes }
    })
  }, [eventos, days, windowStart, windowEnd])

  // ponytail: la grilla de horas (24 * days.length filas) no depende de eventos/foco/tick,
  // solo de `days` — sin memo se reconstruía en cada render (cada 60s del reloj, cada
  // scroll) y era el cuello de botella al entrar a vista día.
  const dayGrid = useMemo(
    () =>
      days.map((d, i) => {
        const dStr = toDateInput(d)
        return (
          <View key={dStr} className="absolute left-0 right-0 flex-row" style={{ top: i * DAY_HEIGHT, height: DAY_HEIGHT }}>
            <View style={{ width: 48 }}>
              {HOURS.map((h) => (
                <View key={h} style={{ height: PX_PER_HOUR }}>
                  {h === 0 && (
                    <Text
                      className={`text-[10px] font-bold pl-1 ${dStr === todayStr ? 'text-igb-yellow-dark' : 'text-igb-on-surface'}`}
                      numberOfLines={1}
                    >
                      {d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </Text>
                  )}
                  <Text className="text-[10px] text-igb-secondary pl-1" style={{ marginTop: h === 0 ? 0 : -6 }}>
                    {String(h).padStart(2, '0')}:00
                  </Text>
                </View>
              ))}
            </View>
            <View className="flex-1 relative border-l border-igb-outline mr-3">
              {HOURS.map((h) => (
                <View key={h} className="absolute left-0 right-0 border-t border-igb-outline" style={{ top: h * PX_PER_HOUR }} />
              ))}
            </View>
          </View>
        )
      }),
    [days, todayStr]
  )

  return (
    <View className="flex-1 bg-igb-surface">
      {(viewMode === 'month' || viewMode === 'week') && (
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[{ flex: 1 }, animatedViewStyle]}>
            {viewMode === 'month' ? (
              <AgendaMonthView
                month={focused}
                focusedStr={focusedStr}
                onSelectDay={(d) => {
                  setFocused(d)
                  setViewMode('week')
                }}
                onChangeMonth={(d) => runNav(d > focused ? 'next' : 'prev')}
              />
            ) : (
              <AgendaWeekView
                weekStart={weekStart}
                focusedStr={focusedStr}
                onSelectDay={navigateToDay}
                onChangeWeek={(d) => runNav(d > focused ? 'next' : 'prev')}
                onBack={() => setViewMode('month')}
              />
            )}
          </Animated.View>
        </GestureDetector>
      )}

      {viewMode === 'day' && (
        <>
      <View className="bg-white border-b border-igb-outline pb-2">
        <View className="flex-row justify-between items-center px-4 pt-3 pb-1">
          <Pressable onPress={() => setViewMode('week')} className="p-2">
            <Text className="text-sm text-igb-secondary">◂ Semana</Text>
          </Pressable>
          <Pressable onPress={() => canNavWeek() && goTo(addDays(focused, -7))} className="p-3" hitSlop={8}>
            <Text className="text-xl">‹</Text>
          </Pressable>
          <Text className="font-semibold text-igb-on-surface">
            {weekStart.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })} - {addDays(weekStart, 6).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
          </Text>
          <Pressable onPress={() => canNavWeek() && goTo(addDays(focused, 7))} className="p-3" hitSlop={8}>
            <Text className="text-xl">›</Text>
          </Pressable>
          <EstadoLegend />
        </View>
        <View className="flex-row px-2">
          {weekDays.map((d, i) => {
            const dStr = toDateInput(d)
            const isSelected = dStr === focusedStr
            const isTodayPill = dStr === todayStr
            const count = eventos.filter((ev) => eventoOcurreEn(ev, dStr)).length
            return (
              <Pressable
                key={dStr}
                onPress={() => goTo(d)}
                className={`flex-1 items-center mx-0.5 py-2 rounded-xl ${isSelected ? 'bg-igb-yellow' : isTodayPill ? 'bg-igb-yellow/10' : ''}`}
              >
                <Text className={`text-xs ${isSelected ? 'text-igb-on-yellow' : 'text-igb-secondary'}`}>{DIAS[i]}</Text>
                <Text className={`text-base font-semibold ${isSelected ? 'text-igb-on-yellow' : 'text-igb-on-surface'}`}>{d.getDate()}</Text>
                {count > 0 && <View className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-igb-on-yellow' : 'bg-igb-navy'}`} />}
              </Pressable>
            )
          })}
        </View>
        <View className="flex-row items-center gap-4 px-4 pt-2.5 border-t border-igb-outline mt-2">
          <View className="flex-row items-center gap-1.5">
            <View className={`w-2.5 h-2.5 rounded-sm ${estadoStripColor('en_curso')}`} />
            <Text className="text-xs text-igb-secondary">En curso <Text className="font-semibold text-igb-on-surface">{focusedCounts.enCurso}</Text></Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className={`w-2.5 h-2.5 rounded-sm ${estadoStripColor('programado')}`} />
            <Text className="text-xs text-igb-secondary">Confirmados <Text className="font-semibold text-igb-on-surface">{focusedCounts.confirmados}</Text></Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className={`w-2.5 h-2.5 rounded-sm ${estadoStripColor('reserva')}`} />
            <Text className="text-xs text-igb-secondary">Pendientes <Text className="font-semibold text-igb-on-surface">{focusedCounts.pendientes}</Text></Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.yellow} />
        </View>
      ) : error ? (
        <View className="flex-1 items-center px-4 pt-8">
          <Text className="text-igb-error text-center">{error}</Text>
        </View>
      ) : (
        <ScrollView
          ref={timelineRef}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 96 }}
          onScroll={handleScroll}
          scrollEventThrottle={100}
          onScrollBeginDrag={clearProgrammaticScroll}
          onMomentumScrollEnd={clearProgrammaticScroll}
        >
          <View style={{ height: days.length * DAY_HEIGHT }}>
            {dayGrid}

            {todayIdx !== -1 && (
              <View
                className="absolute left-[48px] right-3 h-[2px] bg-igb-error z-10"
                style={{ top: todayIdx * DAY_HEIGHT + (nowMinutes() / 60) * PX_PER_HOUR }}
              />
            )}

            <View className="absolute top-0" style={{ left: 48, right: 12, height: days.length * DAY_HEIGHT }}>
              {positioned.map(({ key, ev, top, height, lane, lanes }) => {
                const widthPct = 100 / lanes
                const hasRoomForDetail = height >= 56
                const hasRoomForOperarios = height >= 76 && ev.operarios.length > 0
                const estadoVisual = getEstadoVisual(ev)
                return (
                  <Pressable
                    key={key}
                    onPress={() => router.push(`/agenda/evento/${ev.id}`)}
                    className="absolute bg-white border border-igb-outline rounded-lg overflow-hidden flex-row"
                    style={{
                      top,
                      height,
                      left: `${lane * widthPct}%`,
                      width: `${widthPct}%`,
                      paddingRight: lanes > 1 ? 3 : 0,
                    }}
                  >
                    <View className={`w-1 ${estadoStripColor(estadoVisual)}`} />
                    <View className="flex-1 px-2 py-1">
                      <Text className="text-[11px] font-bold text-igb-on-surface" numberOfLines={1}>
                        {ev.hora_inicio.slice(0, 5)}{ev.hora_fin ? `-${ev.hora_fin.slice(0, 5)}` : ''}
                      </Text>
                      <Text className="text-xs font-semibold text-igb-on-surface" numberOfLines={1}>
                        {ev.grua?.nombre ?? 'Sin grúa'} — {ev.empresa?.nombre ?? 'Sin empresa'}
                      </Text>
                      {hasRoomForDetail && (
                        <View className="flex-row items-center gap-1.5 mt-0.5">
                          <View className={`px-1.5 py-0.5 rounded ${estadoColorClassesLight(estadoVisual)}`}>
                            <Text className={`text-[9px] font-semibold ${estadoColorClassesLight(estadoVisual)}`} numberOfLines={1}>
                              {formatEstado(estadoVisual)}
                            </Text>
                          </View>
                          {ev.ubicacion && (
                            <Text className="text-[10px] text-igb-secondary flex-1" numberOfLines={1}>
                              {ev.ubicacion}
                            </Text>
                          )}
                        </View>
                      )}
                      {hasRoomForOperarios && (
                        <Text className="text-[11px] text-igb-secondary" numberOfLines={1}>
                          {ev.operarios.map((o) => o.nombre).join(', ')}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                )
              })}
            </View>
          </View>
        </ScrollView>
      )}
        </>
      )}

      <Pressable
        onPress={() => router.push('/agenda/evento/nuevo')}
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-igb-yellow items-center justify-center shadow-lg"
      >
        <Text className="text-2xl text-igb-on-yellow">+</Text>
      </Pressable>
    </View>
  )
}
