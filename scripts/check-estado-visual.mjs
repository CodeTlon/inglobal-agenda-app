// Reimplementación 1:1 (sin tipos) de cruzaMedianoche/finDiaEfectivo/getEstadoVisual
// tal como quedaron en src/lib/agenda-view.ts, para verificar el fix de turnos
// nocturnos (con y sin fecha_hasta explícita) con un caso runnable en vez de
// solo razonamiento.
//
// ponytail: sin runner de tests en el repo (no jest/vitest), agregar uno
// para esto sería más infraestructura que el chequeo en sí — es una
// reimplementación aparte, no importa el archivo real, así que si
// cruzaMedianoche/finDiaEfectivo/getEstadoVisual cambian hay que actualizar
// esta copia a mano.
// Correr: node scripts/check-estado-visual.mjs
function toDateInput(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function addDays(d, days) {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + days)
  return copy
}
// fecha_hasta === fecha es el único caso que NO es cruce de medianoche a
// propósito (el usuario puso el mismo día como fin): ahí hora_fin <=
// hora_inicio es un error de formulario de verdad, no un turno nocturno.
function cruzaMedianoche(fecha, fechaHasta, horaInicio, horaFinEfectiva) {
  if (fechaHasta === fecha) return false
  return horaFinEfectiva <= horaInicio
}
function finDiaEfectivo(fecha, fechaHasta, horaInicio, horaFinEfectiva) {
  if (fechaHasta) return fechaHasta
  return cruzaMedianoche(fecha, fechaHasta, horaInicio, horaFinEfectiva)
    ? toDateInput(addDays(new Date(`${fecha}T00:00:00`), 1))
    : fecha
}
function getEstadoVisual(evento, now = new Date()) {
  const horaInicioStr = evento.hora_inicio.slice(0, 8)
  const horaFinEfectiva = (evento.hora_fin ?? '18:00:00').slice(0, 8)
  const inicioGlobal = new Date(`${evento.fecha}T${horaInicioStr}`)
  const crossesMidnight = cruzaMedianoche(evento.fecha, evento.fecha_hasta, horaInicioStr, horaFinEfectiva)
  const finDiaStr = finDiaEfectivo(evento.fecha, evento.fecha_hasta, horaInicioStr, horaFinEfectiva)
  const finGlobal = new Date(`${finDiaStr}T${horaFinEfectiva}`)
  if (evento.estado === 'reserva') {
    if (inicioGlobal <= now) return 'cancelado'
  } else if (evento.estado === 'programado') {
    if (finGlobal < now) return 'finalizado'
    if (inicioGlobal > now) return 'programado'
    if (crossesMidnight) return 'en_curso'
    const horaActual = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
    const dentroDeVentanaHoraria = horaActual >= evento.hora_inicio.slice(0, 8) && horaActual < horaFinEfectiva
    return dentroDeVentanaHoraria ? 'en_curso' : 'programado'
  } else if (evento.estado === 'en_curso') {
    if (finGlobal < now) return 'finalizado'
  }
  return evento.estado
}

let fails = 0
function assertEq(label, actual, expected) {
  const ok = actual === expected
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}: got ${actual}, expected ${expected}`)
  if (!ok) fails++
}

const evNocturno = { fecha: '2026-08-27', fecha_hasta: null, hora_inicio: '20:00:00', hora_fin: null, estado: 'programado' }

// Antes de empezar (19:00) -> debia ser 'programado', el bug viejo daba 'finalizado'
assertEq('nocturno antes de empezar (19:00)', getEstadoVisual(evNocturno, new Date('2026-08-27T19:00:00')), 'programado')
// En curso (21:00, ya arranco) -> 'en_curso', el bug viejo daba 'finalizado'
assertEq('nocturno en curso (21:00)', getEstadoVisual(evNocturno, new Date('2026-08-27T21:00:00')), 'en_curso')
// Pasada medianoche pero antes del cierre (2026-08-28 02:00, cierra 18:00 del dia siguiente) -> 'en_curso'
assertEq('nocturno post-medianoche (28 02:00)', getEstadoVisual(evNocturno, new Date('2026-08-28T02:00:00')), 'en_curso')
// Bien pasado el cierre (2026-08-28 19:00) -> 'finalizado'
assertEq('nocturno terminado (28 19:00)', getEstadoVisual(evNocturno, new Date('2026-08-28T19:00:00')), 'finalizado')

// Caso diurno normal (no debe romperse por el fix): 08:00-13:00
const evDiurno = { fecha: '2026-08-27', fecha_hasta: null, hora_inicio: '08:00:00', hora_fin: '13:00:00', estado: 'programado' }
assertEq('diurno antes (07:00)', getEstadoVisual(evDiurno, new Date('2026-08-27T07:00:00')), 'programado')
assertEq('diurno en curso (10:00)', getEstadoVisual(evDiurno, new Date('2026-08-27T10:00:00')), 'en_curso')
assertEq('diurno terminado (14:00)', getEstadoVisual(evDiurno, new Date('2026-08-27T14:00:00')), 'finalizado')

// Turno nocturno CON fecha_hasta explícita (el bug reportado: 22:00 del día 27
// a 02:00 del día 28, cargado poniendo "fecha fin" = día siguiente en vez de
// dejarlo vacío). cruzaMedianoche ya no excluye este caso por tener
// fecha_hasta puesta, así que se comporta igual que el turno nocturno sin
// fecha_hasta: una sola ventana continua hasta fecha_hasta + hora_fin.
const evNocturnoConFechaHasta = { fecha: '2026-08-27', fecha_hasta: '2026-08-28', hora_inicio: '22:00:00', hora_fin: '02:00:00', estado: 'programado' }
assertEq('nocturno+fecha_hasta antes de empezar (21:00)', getEstadoVisual(evNocturnoConFechaHasta, new Date('2026-08-27T21:00:00')), 'programado')
assertEq('nocturno+fecha_hasta en curso (23:00)', getEstadoVisual(evNocturnoConFechaHasta, new Date('2026-08-27T23:00:00')), 'en_curso')
assertEq('nocturno+fecha_hasta post-medianoche (28 01:00)', getEstadoVisual(evNocturnoConFechaHasta, new Date('2026-08-28T01:00:00')), 'en_curso')
assertEq('nocturno+fecha_hasta terminado (28 03:00)', getEstadoVisual(evNocturnoConFechaHasta, new Date('2026-08-28T03:00:00')), 'finalizado')

// Multi-dia (fecha_hasta) con arranque nocturno y SIN hora_fin explícita: el
// default de cierre (18:00) queda <= hora_inicio (20:00), así que también es
// cruce de medianoche — antes del fix esto quedaba "programado" todo el
// rango (fecha_hasta lo excluía de cruzaMedianoche); ahora arranca 'en_curso'
// apenas empieza, igual que cualquier turno nocturno.
const evMultiDia = { fecha: '2026-09-02', fecha_hasta: '2026-09-04', hora_inicio: '20:00:00', hora_fin: null, estado: 'programado' }
assertEq('multi-dia nocturno sin hora_fin, en curso (21:00)', getEstadoVisual(evMultiDia, new Date('2026-09-02T21:00:00')), 'en_curso')

process.exit(fails === 0 ? 0 : 1)
