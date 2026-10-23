import type { EventoAgenda } from './types'

type GruaRef = { id: string; nombre: string }

/** Grúas del servicio (la primera es la principal). Cae a `grua`/`grua_id` si el servidor es una versión anterior. */
export function gruasDe(ev: Pick<EventoAgenda, 'gruas' | 'grua' | 'grua_id'>): GruaRef[] {
  if (ev.gruas && ev.gruas.length > 0) return ev.gruas
  if (ev.grua_id && ev.grua) return [{ id: ev.grua_id, nombre: ev.grua.nombre }]
  return []
}

/** Nombres de todas las grúas unidos, para tarjetas y detalle. */
export function nombresGruas(ev: Pick<EventoAgenda, 'gruas' | 'grua' | 'grua_id'>, sep = ' · ', vacio = 'Sin grúa'): string {
  const nombres = gruasDe(ev).map((g) => g.nombre)
  return nombres.length > 0 ? nombres.join(sep) : vacio
}

/** Las primeras `max` grúas y cuántas quedan afuera, por separado: el "+N" se dibuja aparte para que el recorte del texto no se lo coma. */
export function partesResumenGruas(ev: Pick<EventoAgenda, 'gruas' | 'grua' | 'grua_id'>, max = 2, sep = ' · ', vacio = 'Sin grúa'): { texto: string; resto: number } {
  const nombres = gruasDe(ev).map((g) => g.nombre)
  if (nombres.length === 0) return { texto: vacio, resto: 0 }
  return { texto: nombres.slice(0, max).join(sep), resto: Math.max(0, nombres.length - max) }
}

/** Versión corta en un solo string: las primeras `max` grúas y "+N" con el resto. */
export function resumenGruas(ev: Pick<EventoAgenda, 'gruas' | 'grua' | 'grua_id'>, max = 2, sep = ' · ', vacio = 'Sin grúa'): string {
  const { texto, resto } = partesResumenGruas(ev, max, sep, vacio)
  return resto > 0 ? `${texto} +${resto}` : texto
}
