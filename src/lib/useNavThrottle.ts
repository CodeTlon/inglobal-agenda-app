import { useRef } from 'react'

// ponytail: throttle por ref, no debounce con timers — evita que varios taps
// rápidos en las flechas de mes/semana/día (el típico "tap de ansiedad"
// mientras se ve la transición) se acumulen en saltos de varias semanas.
// Techo: ventana fija en 400ms, no configurable por vista.
export function useNavThrottle(ms = 400) {
  const last = useRef(0)
  return () => {
    const now = Date.now()
    if (now - last.current < ms) return false
    last.current = now
    return true
  }
}
