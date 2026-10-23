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

/** Versión corta para tarjetas: las primeras `max` grúas y "+N" con el resto, para que no se corte sin avisar. */
export function resumenGruas(ev: Pick<EventoAgenda, 'gruas' | 'grua' | 'grua_id'>, max = 2, sep = ' · ', vacio = 'Sin grúa'): string {
  const nombres = gruasDe(ev).map((g) => g.nombre)
  if (nombres.length === 0) return vacio
  const resto = nombres.length - max
  return resto > 0 ? `${nombres.slice(0, max).join(sep)} +${resto}` : nombres.join(sep)
}
