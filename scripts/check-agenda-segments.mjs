// Reimplementación mínima del cálculo de segmentos/altura de cards de
// src/app/(tabs)/agenda/index.tsx (el useMemo `positioned`), para verificar
// con un caso runnable que un turno nocturno CON fecha_hasta explícita (ej.
// 22:00 del día 27 a 02:00 del día 28) arma UNA sola card continua en vez de
// una card rota por día — el bug reportado en la vista de agenda.
//
// ponytail: sin runner de tests en el repo, reimplementación aparte en vez
// de importar el .tsx real (JSX + hooks, no se puede requerir tal cual desde
// node). Si el useMemo cambia, actualizar esta copia a mano.
// Correr: node scripts/check-agenda-segments.mjs
const PX_PER_HOUR = 60
const DAY_HEIGHT = 24 * PX_PER_HOUR
const MIN_CARD_HEIGHT = 44

function toMinutes(hhmmss) {
  const [h, m] = hhmmss.split(':').map(Number)
  return h * 60 + m
}
function cruzaMedianoche(fecha, fechaHasta, horaInicio, horaFinEfectiva) {
  if (fechaHasta === fecha) return false
  return horaFinEfectiva <= horaInicio
}
function toDateInput(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function finDiaEfectivo(fecha, fechaHasta) {
  if (fechaHasta) return fechaHasta
  const siguiente = new Date(`${fecha}T00:00:00`)
  siguiente.setDate(siguiente.getDate() + 1)
  return toDateInput(siguiente)
}

// Arma los segmentos de un evento tal como lo hace el useMemo `positioned`
// (sin el filtrado por ventana visible ni los carriles, que no hacen a este
// bug), y devuelve su altura en px para un `dayIdx` dado.
function segmentoNocturno(ev, dayIdx) {
  const horaFinEfectiva = ev.hora_fin ?? '18:00'
  const crossesMidnight = cruzaMedianoche(ev.fecha, ev.fecha_hasta, ev.hora_inicio, horaFinEfectiva)
  const finDia = crossesMidnight ? finDiaEfectivo(ev.fecha, ev.fecha_hasta) : ev.fecha
  const startMin = toMinutes(ev.hora_inicio)
  const endMin = toMinutes(horaFinEfectiva)
  const diasHastaFin = crossesMidnight
    ? Math.round((new Date(`${finDia}T00:00:00`).getTime() - new Date(`${ev.fecha}T00:00:00`).getTime()) / 86400000)
    : 0
  const endDayIdx = dayIdx + diasHastaFin
  const top = dayIdx * DAY_HEIGHT + (startMin / 60) * PX_PER_HOUR
  const bottom = endDayIdx * DAY_HEIGHT + (endMin / 60) * PX_PER_HOUR
  return { crossesMidnight, endDayIdx, height: Math.max(bottom - top, MIN_CARD_HEIGHT) }
}

let fails = 0
function assertEq(label, actual, expected) {
  const ok = actual === expected
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}: got ${actual}, expected ${expected}`)
  if (!ok) fails++
}

// El bug reportado: 22:00 día 27 -> 02:00 día 28, con "fecha fin" (fecha_hasta)
// puesta explícitamente al día siguiente. Antes del fix, `fecha_hasta` puesta
// hacía que crossesMidnight diera false y la card quedaba en el mismo día
// (endDayIdx === dayIdx), con altura clampeada a MIN_CARD_HEIGHT (rota).
const nocturnoConFechaHasta = { fecha: '2026-08-27', fecha_hasta: '2026-08-28', hora_inicio: '22:00', hora_fin: '02:00' }
const seg = segmentoNocturno(nocturnoConFechaHasta, 3)
assertEq('nocturno+fecha_hasta cruza medianoche', seg.crossesMidnight, true)
assertEq('nocturno+fecha_hasta termina un día después', seg.endDayIdx, 4)
// 4hs reales (22:00->02:00): bien por encima del mínimo de una card rota.
assertEq('nocturno+fecha_hasta altura = 4hs', seg.height, 4 * PX_PER_HOUR)

// Mismo turno pero sin fecha_hasta (ya funcionaba antes del fix) — no debe
// romperse por el cambio.
const nocturnoSinFechaHasta = { fecha: '2026-08-27', fecha_hasta: null, hora_inicio: '22:00', hora_fin: '02:00' }
const seg2 = segmentoNocturno(nocturnoSinFechaHasta, 3)
assertEq('nocturno sin fecha_hasta cruza medianoche', seg2.crossesMidnight, true)
assertEq('nocturno sin fecha_hasta termina un día después', seg2.endDayIdx, 4)
assertEq('nocturno sin fecha_hasta altura = 4hs', seg2.height, 4 * PX_PER_HOUR)

// Turno diurno normal con fecha_hasta multi-día (no debe cruzar medianoche
// ni romperse): 09:00-18:00, mismo día.
const diurno = { fecha: '2026-08-27', fecha_hasta: '2026-08-29', hora_inicio: '09:00', hora_fin: '18:00' }
const seg3 = segmentoNocturno(diurno, 3)
assertEq('diurno con fecha_hasta no cruza medianoche', seg3.crossesMidnight, false)
assertEq('diurno con fecha_hasta altura = 9hs', seg3.height, 9 * PX_PER_HOUR)

process.exit(fails === 0 ? 0 : 1)
