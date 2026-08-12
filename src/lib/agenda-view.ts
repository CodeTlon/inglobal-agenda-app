/**
 * Helpers puros para las vistas de calendario — copiado 1:1 de inglobal-site/lib/agenda-view.ts
 * (sin date-fns, sin dependencias de Next/browser) para que mobile, web y TV coincidan
 * exactamente en semana/estado visual/layout de eventos superpuestos.
 */

import type { EventoAgenda } from './types'

// Fecha local en formato YYYY-MM-DD. OJO: d.toISOString() pasa a UTC — con
// Argentina en UTC-3 eso corre la fecha "hoy" un día para adelante entre las
// 21:00 y las 23:59 locales (el reloj UTC ya cruzó medianoche). Por eso se arma
// con los componentes locales de `d`, nunca con toISOString().
export function toDateInput(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + days)
  return copy
}

/** Lunes de la semana (Lun-Dom) que contiene `d`. */
export function getWeekStart(d: Date): Date {
  const day = d.getDay() // 0=Dom..6=Sáb
  const diff = day === 0 ? -6 : 1 - day
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff)
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

/** Matriz de semanas (Lun-Dom) que cubre el mes de `d`, con días de meses vecinos para completar la grilla. */
export function getMonthMatrix(d: Date): Date[][] {
  const start = getWeekStart(new Date(d.getFullYear(), d.getMonth(), 1))
  const end = getWeekStart(new Date(d.getFullYear(), d.getMonth() + 1, 0))
  const weeks: Date[][] = []
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 7)) {
    weeks.push(getWeekDays(cursor))
  }
  return weeks
}

const ESTADO_COLORS: Record<string, string> = {
  reserva: 'bg-igb-navy/20 border-igb-navy/40 text-blue-200',
  programado: 'bg-igb-yellow/20 border-igb-yellow/40 text-igb-yellow',
  en_curso: 'bg-blue-500/20 border-blue-400/40 text-blue-300',
  finalizado: 'bg-white/5 border-white/10 text-slate-400',
  cancelado: 'bg-red-500/10 border-red-400/30 text-red-300 line-through',
}

export function estadoColorClasses(estado: string): string {
  return ESTADO_COLORS[estado] ?? ESTADO_COLORS.programado
}

/** Paleta clara (fondo blanco) — usada por la vista semanal, no por la TV. */
const ESTADO_COLORS_LIGHT: Record<string, string> = {
  reserva: 'bg-igb-navy/10 border-igb-navy/30 text-igb-navy',
  programado: 'bg-igb-yellow/15 border-igb-yellow/30 text-igb-yellow-dark',
  en_curso: 'bg-blue-50 border-blue-200 text-blue-600',
  finalizado: 'bg-zinc-100 border-zinc-200 text-zinc-500',
  cancelado: 'bg-red-50 border-red-200 text-red-500 line-through',
}

export function estadoColorClassesLight(estado: string): string {
  return ESTADO_COLORS_LIGHT[estado] ?? ESTADO_COLORS_LIGHT.programado
}

/** Color sólido para la franja lateral de una card — mismo mapeo que ESTADO_COLORS_LIGHT. */
const ESTADO_STRIP: Record<string, string> = {
  reserva: 'bg-igb-navy',
  programado: 'bg-igb-yellow',
  en_curso: 'bg-blue-500',
  finalizado: 'bg-zinc-300',
  cancelado: 'bg-red-400',
}

export function estadoStripColor(estado: string): string {
  return ESTADO_STRIP[estado] ?? ESTADO_STRIP.programado
}

/** "en_curso" -> "En curso", "programado" -> "Programado". */
export function formatEstado(estado: string): string {
  return estado.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

/**
 * Estado *visual* según la hora actual, sin tocar la DB — red de seguridad para la
 * ventana entre un fetch y el siguiente (el server ya persiste lo mismo al leer, ver
 * `estadoTransicionado` en inglobal-site/lib/agenda-business.ts, una sola fuente de
 * reglas repetida acá solo porque el fetch pudo haber pasado hace rato).
 *  - `reserva` nunca confirmada cuya ventana ya pasó -> `cancelado` (no avanza sola a
 *    `programado`/`en_curso`, una reserva sin confirmar que venció está cancelada).
 *  - `programado` se ve `en_curso` solo DENTRO de la ventana [hora_inicio, hora_fin)
 *    de cada día del rango (no las 24hs corridas) — se repite día a día desde
 *    `fecha` hasta `fecha_hasta`. Sin `hora_fin` la ventana cierra a las 18:00
 *    (fin de jornada); sin `fecha_hasta` el rango es de un solo día.
 *    OJO: el backend (`estadoTransicionado`/`rangosSeSolapan` en
 *    inglobal-site/lib/agenda-business.ts, y el EXCLUDE constraint de la DB)
 *    todavía usa 23:59 como default — mismatch pendiente de resolver ahí si
 *    se quiere el mismo corte de las 18:00 también para conflictos/DB.
 *  - `programado` cuya ventana del último día ya terminó -> `finalizado`.
 *  - `en_curso` se cierra a mano (finalizarlo es una decisión, no algo automático).
 */
export function getEstadoVisual(evento: EventoAgenda, now = new Date()): string {
  const ultimoDia = evento.fecha_hasta ?? evento.fecha
  const horaFinEfectiva = (evento.hora_fin ?? '18:00:00').slice(0, 8)
  const inicioGlobal = new Date(`${evento.fecha}T${evento.hora_inicio.slice(0, 8)}`)
  const finGlobal = new Date(`${ultimoDia}T${horaFinEfectiva}`)
  if (evento.estado === 'reserva') {
    if (finGlobal < now) return 'cancelado'
  } else if (evento.estado === 'programado') {
    if (finGlobal < now) return 'finalizado'
    if (inicioGlobal > now) return 'programado'
    const horaActual = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
    const dentroDeVentanaHoraria = horaActual >= evento.hora_inicio.slice(0, 8) && horaActual < horaFinEfectiva
    return dentroDeVentanaHoraria ? 'en_curso' : 'programado'
  }
  return evento.estado
}

export interface DayLayoutSlot {
  lane: number
  lanes: number
}

/**
 * Carriles side-by-side para eventos de un mismo día que se solapan en horario
 * (antes se apilaban todos ocupando el ancho completo de la columna, ilegibles).
 * Algoritmo greedy: agrupa eventos en "clusters" de solapamiento consecutivo y
 * dentro de cada cluster asigna cada evento al primer carril (lane) que esté
 * ya libre (greedy, ordenado por hora de inicio).
 */
export function layoutDayEvents<T extends { hora_inicio: string; hora_fin?: string | null }>(
  eventos: T[],
): Map<T, DayLayoutSlot> {
  const layout = new Map<T, DayLayoutSlot>()
  const sorted = [...eventos].sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))

  let cluster: T[] = []
  let clusterEnd = ''

  function flushCluster() {
    if (cluster.length === 0) return
    const laneEnds: string[] = []
    const laneOf = new Map<T, number>()
    for (const ev of cluster) {
      const fin = ev.hora_fin ?? '23:59'
      let lane = laneEnds.findIndex((end) => end <= ev.hora_inicio)
      if (lane === -1) {
        lane = laneEnds.length
        laneEnds.push(fin)
      } else {
        laneEnds[lane] = fin
      }
      laneOf.set(ev, lane)
    }
    const lanes = laneEnds.length
    for (const ev of cluster) layout.set(ev, { lane: laneOf.get(ev)!, lanes })
    cluster = []
    clusterEnd = ''
  }

  for (const ev of sorted) {
    const fin = ev.hora_fin ?? '23:59'
    if (cluster.length > 0 && ev.hora_inicio >= clusterEnd) flushCluster()
    cluster.push(ev)
    clusterEnd = cluster.length === 1 ? fin : fin > clusterEnd ? fin : clusterEnd
  }
  flushCluster()

  return layout
}
