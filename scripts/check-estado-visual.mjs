// Reimplementación 1:1 (sin tipos) de getEstadoVisual tal como quedó en
// src/lib/agenda-view.ts, para verificar el fix de turnos nocturnos con un
// caso runnable en vez de solo razonamiento.
//
// ponytail: sin runner de tests en el repo (no jest/vitest), agregar uno
// para esto sería más infraestructura que el chequeo en sí — es una
// reimplementación aparte, no importa el archivo real, así que si
// getEstadoVisual cambia hay que actualizar esta copia a mano.
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
function getEstadoVisual(evento, now = new Date()) {
  const ultimoDia = evento.fecha_hasta ?? evento.fecha
  const horaFinEfectiva = (evento.hora_fin ?? '18:00:00').slice(0, 8)
  const inicioGlobal = new Date(`${evento.fecha}T${evento.hora_inicio.slice(0, 8)}`)
  const crossesMidnight = !evento.fecha_hasta && horaFinEfectiva <= evento.hora_inicio.slice(0, 8)
  const finDiaStr = crossesMidnight ? toDateInput(addDays(new Date(`${ultimoDia}T00:00:00`), 1)) : ultimoDia
  const finGlobal = new Date(`${finDiaStr}T${horaFinEfectiva}`)
  if (evento.estado === 'reserva') {
    if (finGlobal < now) return 'cancelado'
  } else if (evento.estado === 'programado') {
    if (finGlobal < now) return 'finalizado'
    if (inicioGlobal > now) return 'programado'
    if (crossesMidnight) return 'en_curso'
    const horaActual = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
    const dentroDeVentanaHoraria = horaActual >= evento.hora_inicio.slice(0, 8) && horaActual < horaFinEfectiva
    return dentroDeVentanaHoraria ? 'en_curso' : 'programado'
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

// Multi-dia (fecha_hasta) NO usa crossesMidnight (mismo scope que index.tsx: el
// fix solo aplica a eventos de un solo dia) -- un multi-dia con hora_inicio
// nocturna y sin hora_fin queda con una ventana horaria diaria [20:00, 18:00)
// que nunca matchea ningun horario real: se ve 'programado' todo el rango en
// vez de 'en_curso'. Limitacion conocida, no cubierta por este fix (caso mas
// raro: multi-dia + sin hora_fin + arranque nocturno, ninguno de los eventos
// de ejemplo la dispara).
const evMultiDia = { fecha: '2026-09-02', fecha_hasta: '2026-09-04', hora_inicio: '20:00:00', hora_fin: null, estado: 'programado' }
assertEq('multi-dia nocturno sin hora_fin (limitacion conocida)', getEstadoVisual(evMultiDia, new Date('2026-09-02T21:00:00')), 'programado')

process.exit(fails === 0 ? 0 : 1)
