import { useEffect, useRef, useState, type ReactNode } from 'react'
import { View, ScrollView, Pressable, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Picker } from '@react-native-picker/picker'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/Text'
import { TextInput } from '@/components/TextInput'
import { ErrorBanner } from '@/components/ErrorBanner'
import {
  getGruas,
  getEmpresasAgenda,
  getOperarios,
  getRecursosOcupados,
  createEvento,
  updateEvento,
  type EventoPayload,
} from '@/lib/agenda-api'
import { ApiError } from '@/lib/api'
import { toDateInput, formatEstado, getEstadoVisual } from '@/lib/agenda-view'
import { type EstadoEvento, type EventoAgenda, type Grua, type EmpresaAgenda, type Operario } from '@/lib/types'
import { colors } from '@/lib/colors'

// Lista de horarios en pasos de 15' (00:00..23:45) para elegir hora rápido
// tipeando/scrolleando en vez de girar la rueda del picker nativo.
// Mismo umbral que exige el server (MIN_DURACION_MIN en
// inglobal-site/lib/validations/agenda.ts) — validado acá también para no
// hacer ida y vuelta al server por algo que se puede saber al tipear.
const MIN_DURACION_MIN = 15

function minutosDelDia(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, '0')
  const m = String((i % 4) * 15).padStart(2, '0')
  return `${h}:${m}`
})

export function EventoForm({
  initial,
  onDone,
  footer,
}: {
  initial?: EventoAgenda
  onDone: () => void
  footer?: ReactNode
}) {
  const isEdit = !!initial
  // Usa el estado VISUAL (no el crudo de la DB) — un evento que el usuario ve
  // como "Finalizado" por ventana horaria vencida puede seguir en estado
  // 'programado' en la base hasta que alguien vuelva a leerlo (ver
  // getEstadoVisual), y no debería quedar editable solo por ese desfasaje.
  const locked = isEdit && ['en_curso', 'cancelado', 'finalizado'].includes(getEstadoVisual(initial))

  const [gruas, setGruas] = useState<Grua[]>([])
  const [empresas, setEmpresas] = useState<EmpresaAgenda[]>([])
  const [operarios, setOperarios] = useState<Operario[]>([])
  const [loadingCatalogos, setLoadingCatalogos] = useState(true)

  const [fecha, setFecha] = useState(initial?.fecha ?? toDateInput(new Date()))
  const [fechaHasta, setFechaHasta] = useState(initial?.fecha_hasta ?? '')
  const [horaInicio, setHoraInicio] = useState(initial?.hora_inicio?.slice(0, 5) ?? '08:00')
  const [horaFin, setHoraFin] = useState(initial?.hora_fin?.slice(0, 5) ?? '')
  const [gruaId, setGruaId] = useState(initial?.grua_id ?? '')
  const [empresaId, setEmpresaId] = useState(initial?.empresa_id ?? '')
  const [ubicacion, setUbicacion] = useState(initial?.ubicacion ?? '')
  const [notas, setNotas] = useState(initial?.notas ?? '')
  const [estado, setEstado] = useState<EstadoEvento>(initial?.estado ?? 'programado')
  const [operarioIds, setOperarioIds] = useState<string[]>(initial?.operarios.map((o) => o.id) ?? [])

  // Al crear un evento hoy no tiene sentido ofrecer horas de inicio ya
  // pasadas — esto NO toca el picker de hora de fin, que en el caso
  // nocturno (22:00→02:00) es del día siguiente y "menor" en el reloj.
  const todayStr = toDateInput(new Date())
  const nowMinutes = minutosDelDia(`${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`)
  const horaInicioOptions = !isEdit && fecha === todayStr ? TIME_OPTIONS.filter((t) => minutosDelDia(t) >= nowMinutes) : TIME_OPTIONS

  useEffect(() => {
    if (!isEdit && fecha === todayStr && horaInicioOptions.length > 0 && !horaInicioOptions.includes(horaInicio)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- corrige un horaInicio que quedó en el pasado al cambiar de fecha, no un fetch
      setHoraInicio(horaInicioOptions[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe reaccionar a cambios de fecha, no en cada minuto que pasa
  }, [fecha])

  const [ocupados, setOcupados] = useState<{ gruaIds: string[]; operarioIds: string[] }>({ gruaIds: [], operarioIds: [] })
  const [ocupadosError, setOcupadosError] = useState(false)
  const ocupadosRequestRef = useRef(0)
  const [showPicker, setShowPicker] = useState<null | 'fecha' | 'fechaHasta'>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Al editar hay que traer también los inactivos: si la grúa/empresa/operario
    // asignado al evento fue desactivado después, con solo activos desaparecía
    // del picker/checklist sin que se note, sin forma de verlo ni desasignarlo.
    Promise.all([getGruas(isEdit), getEmpresasAgenda(isEdit), getOperarios(isEdit)])
      .then(([g, e, o]) => {
        setGruas(g)
        setEmpresas(e)
        setOperarios(o)
      })
      .catch(() => setError('No se pudieron cargar los catálogos.'))
      .finally(() => setLoadingCatalogos(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isEdit fijo por instancia, solo debe correr al montar
  }, [])

  useEffect(() => {
    if (!fecha || !horaInicio) return
    // requestId: si el usuario cambia hora/fecha rápido (varios toques
    // seguidos en el picker) pueden salir 3-4 requests en simultáneo, sin
    // garantía de que respondan en orden — solo aplicamos la respuesta si
    // sigue siendo la última pedida, si no `ocupados` podía terminar
    // reflejando la disponibilidad de un horario distinto al elegido.
    const requestId = ++ocupadosRequestRef.current
    // eslint-disable-next-line react-hooks/set-state-in-effect -- limpia el error previo antes de re-pedir; requestId ya evita condiciones de carrera
    setOcupadosError(false)
    getRecursosOcupados({ fecha, fechaHasta: fechaHasta || null, horaInicio, horaFin: horaFin || null, excludeEventoId: initial?.id })
      .then((data) => {
        if (requestId === ocupadosRequestRef.current) setOcupados(data)
      })
      .catch(() => {
        // Antes esto se tragaba en silencio y `ocupados` quedaba vacío — la
        // validación de conflicto pasaba igual, dejando asignar una
        // grúa/operario en realidad ocupado. Bloqueamos el submit en vez de
        // adivinar disponibilidad con datos que no llegaron.
        if (requestId === ocupadosRequestRef.current) setOcupadosError(true)
      })
    // `initial?.id` en deps: no cambia durante la vida de esta instancia (cada
    // evento distinto remonta el form vía navegación, mismo criterio que el
    // efecto de arriba) — se agrega solo para que el lint quede documentado
    // en vez de generar dudas de nuevo.
  }, [fecha, fechaHasta, horaInicio, horaFin, initial?.id])

  // El estado solo se elige acá al crear (reserva vs. programado). Al editar, el
  // cambio de estado se hace desde el control rápido en la pantalla de detalle
  // (evento/[id].tsx) — no compite con los datos específicos del evento.
  const opcionesEstado: EstadoEvento[] = ['reserva', 'programado']

  function toggleOperario(id: string) {
    setOperarioIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function handleSubmit() {
    if (!gruaId || !empresaId) {
      setError('Seleccioná grúa y empresa.')
      return
    }
    if (operarioIds.length === 0) {
      setError('Asigná al menos un operario.')
      return
    }
    // Al editar se permite fecha pasada (ej. cerrar un evento viejo) — igual
    // que crearEventoSchema/eventoAgendaSchema del lado del servidor.
    if (!isEdit && fecha < toDateInput(new Date())) {
      setError('La fecha no puede ser anterior a hoy.')
      return
    }
    if (ocupadosError) {
      setError('No se pudo confirmar la disponibilidad de grúa/operarios. Revisá tu conexión e intentá de nuevo.')
      return
    }
    if (ocupados.gruaIds.includes(gruaId)) {
      setError('La grúa seleccionada ya está ocupada en ese horario. Elegí otra.')
      return
    }
    if (operarioIds.some((id) => ocupados.operarioIds.includes(id))) {
      setError('Uno o más operarios seleccionados ya están ocupados en ese horario.')
      return
    }
    if (fechaHasta && fechaHasta < fecha) {
      setError('La fecha de fin no puede ser anterior a la fecha de inicio.')
      return
    }
    // Sin fecha_hasta, hora_fin <= hora_inicio significa "cruza medianoche"
    // (turno nocturno, ej. 22:00→02:00) — caso válido, mismo criterio que
    // crossesMidnight en agenda-view.ts/agenda/index.tsx. Solo es error de
    // verdad cuando el rango es explícitamente el mismo día.
    if (fechaHasta === fecha && horaFin && horaFin <= horaInicio) {
      setError('La hora de fin debe ser posterior a la hora de inicio.')
      return
    }
    // Duración mínima — mismo umbral que ya validaba el server (por eso
    // este error se veía recién después de guardar). Cruza medianoche:
    // la duración real suma lo que queda del día 1 más lo del día 2.
    const crossesMidnight = !fechaHasta && !!horaFin && horaFin <= horaInicio
    if (horaFin && (crossesMidnight || fechaHasta === fecha)) {
      const durMin = crossesMidnight
        ? 24 * 60 - minutosDelDia(horaInicio) + minutosDelDia(horaFin)
        : minutosDelDia(horaFin) - minutosDelDia(horaInicio)
      if (durMin < MIN_DURACION_MIN) {
        setError(`La hora de fin debe ser al menos ${MIN_DURACION_MIN} minutos después de la de inicio.`)
        return
      }
    }
    setSaving(true)
    setError(null)
    const payload: EventoPayload = {
      fecha,
      fecha_hasta: fechaHasta || null,
      hora_inicio: horaInicio,
      hora_fin: horaFin || null,
      grua_id: gruaId,
      empresa_id: empresaId,
      ubicacion: ubicacion || null,
      notas: notas || null,
      estado,
      operario_ids: operarioIds,
    }
    try {
      if (isEdit) await updateEvento(initial.id, payload)
      else await createEvento(payload)
      onDone()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar el evento.')
    } finally {
      setSaving(false)
    }
  }

  if (loadingCatalogos) {
    return (
      <View className="flex-1 items-center justify-center bg-igb-surface">
        <ActivityIndicator color={colors.yellow} />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
    <ScrollView className="flex-1 bg-igb-surface px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
      {locked && (
        <View className="bg-igb-navy/5 border border-igb-navy/20 rounded-lg p-3 mb-4">
          <Text className="text-igb-navy text-sm">
            {initial?.estado === 'en_curso'
              ? 'Un evento en curso solo permite cambiar el estado.'
              : 'Un evento cancelado o finalizado no se puede editar.'}
          </Text>
        </View>
      )}

      <Field label="Fecha">
        <Pressable disabled={locked} onPress={() => setShowPicker('fecha')} className="border border-igb-outline rounded-lg px-4 py-3 bg-white">
          <Text className="text-igb-on-surface">{fecha}</Text>
        </Pressable>
      </Field>

      <Field label="Fecha de fin (opcional, para reservas de varios días)">
        <Pressable disabled={locked} onPress={() => setShowPicker('fechaHasta')} className="border border-igb-outline rounded-lg px-4 py-3 bg-white">
          <Text className="text-igb-on-surface">{fechaHasta || 'Sin definir'}</Text>
        </Pressable>
      </Field>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Field label="Hora de inicio">
            <View className="border border-igb-outline rounded-lg bg-white">
              <Picker enabled={!locked} selectedValue={horaInicio} onValueChange={setHoraInicio}>
                {horaInicioOptions.map((t) => (
                  <Picker.Item key={t} label={t} value={t} />
                ))}
              </Picker>
            </View>
          </Field>
        </View>
        <View className="flex-1">
          <Field label="Hora de fin (opcional)">
            <View className="border border-igb-outline rounded-lg bg-white">
              <Picker enabled={!locked} selectedValue={horaFin} onValueChange={setHoraFin}>
                <Picker.Item label="Sin definir" value="" />
                {TIME_OPTIONS.map((t) => (
                  <Picker.Item key={t} label={t} value={t} />
                ))}
              </Picker>
            </View>
          </Field>
        </View>
      </View>

      {showPicker && (
        <DateTimePicker
          // new Date("YYYY-MM-DD") sin hora parsea como medianoche UTC, no
          // local — con Argentina en UTC-3 el picker terminaba abriendo (y a
          // veces guardando) un día antes/después del que tenía el string.
          // Con "T00:00:00" el motor de JS lo toma como hora local.
          value={showPicker === 'fecha' ? new Date(`${fecha}T00:00:00`) : new Date(`${fechaHasta || fecha}T00:00:00`)}
          // Al editar se permite fecha pasada (ej. cerrar un evento viejo).
          // Al elegir fecha de fin, el mínimo es la fecha de inicio (no hoy)
          // para que sea imposible elegir un rango invertido desde el picker.
          minimumDate={!isEdit ? (showPicker === 'fechaHasta' ? new Date(`${fecha}T00:00:00`) : new Date()) : undefined}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          // En iOS el spinner dispara onValueChange en cada vuelta de rueda (a
          // diferencia del diálogo modal de Android, que confirma una sola
          // vez) — cerrar acá lo desmontaba apenas el usuario tocaba el
          // selector, sin dejarlo llegar a la fecha elegida. En iOS solo
          // actualiza el valor; el botón "Listo" de abajo cierra.
          onValueChange={(_, date) => {
            if (Platform.OS !== 'ios') setShowPicker(null)
            if (showPicker === 'fecha') setFecha(toDateInput(date))
            else setFechaHasta(toDateInput(date))
          }}
          onDismiss={() => setShowPicker(null)}
        />
      )}
      {showPicker && Platform.OS === 'ios' && (
        <Pressable onPress={() => setShowPicker(null)} className="items-center py-2 bg-white border-t border-igb-outline mb-1">
          <Text className="text-igb-navy font-semibold">Listo</Text>
        </Pressable>
      )}

      <Field label="Grúa">
        {/* Lista de filas en vez de <Picker.Item enabled={false}> — ese
            "enabled" no bloquea el toque de forma confiable en todas las
            plataformas, dejaba elegir una grúa ocupada aunque se viera en
            rojo. Mismo patrón de fila que Operarios, disponibles primero. */}
        <View className="border border-igb-outline rounded-lg bg-white p-2">
          {[...gruas]
            .sort((a, b) => Number(ocupados.gruaIds.includes(a.id)) - Number(ocupados.gruaIds.includes(b.id)))
            .map((g) => {
              const ocupada = ocupados.gruaIds.includes(g.id)
              const selected = gruaId === g.id
              const isDisabled = locked || (ocupada && !selected)
              return (
                <Pressable
                  key={g.id}
                  // Ya seleccionada se deja elegible para no trabar el form si
                  // se ocupó después de elegirla (ej. se cambió el horario).
                  disabled={isDisabled}
                  onPress={() => setGruaId(g.id)}
                  className="flex-row items-center py-2 px-1"
                >
                  <View className={`w-5 h-5 rounded-full border mr-3 items-center justify-center ${isDisabled ? 'opacity-40' : ''} ${selected ? 'border-igb-yellow' : 'border-igb-outline'}`}>
                    {selected && <View className="w-2.5 h-2.5 rounded-full bg-igb-yellow" />}
                  </View>
                  <Text className={ocupada ? 'text-igb-error flex-1' : !g.activo ? 'text-igb-secondary flex-1' : 'text-igb-on-surface flex-1'} numberOfLines={1}>
                    {g.nombre}{ocupada ? ' (ocupada)' : ''}{!g.activo ? ' (inactiva)' : ''}
                  </Text>
                </Pressable>
              )
            })}
        </View>
        {gruaId && ocupados.gruaIds.includes(gruaId) && (
          <Text className="text-igb-error text-xs mt-1">Esta grúa ya está ocupada en ese horario.</Text>
        )}
      </Field>

      <Field label="Empresa">
        <View className="border border-igb-outline rounded-lg bg-white">
          <Picker enabled={!locked} selectedValue={empresaId} onValueChange={setEmpresaId}>
            <Picker.Item label="Seleccioná una empresa" value="" />
            {empresas.map((e) => (
              <Picker.Item key={e.id} label={`${e.nombre}${!e.activo ? ' (inactiva)' : ''}`} value={e.id} color={!e.activo ? '#575d78' : undefined} />
            ))}
          </Picker>
        </View>
      </Field>

      <Field label="Operarios">
        <View className="border border-igb-outline rounded-lg bg-white p-2">
          {[...operarios]
            .sort((a, b) => Number(ocupados.operarioIds.includes(a.id)) - Number(ocupados.operarioIds.includes(b.id)))
            .map((o) => {
            const selected = operarioIds.includes(o.id)
            const ocupado = ocupados.operarioIds.includes(o.id)
            const isDisabled = locked || (ocupado && !selected)
            return (
              <Pressable
                key={o.id}
                // Ya seleccionado se deja togglable para no trabar la lista si
                // se ocupó después de elegirlo (ej. se cambió el horario).
                disabled={isDisabled}
                onPress={() => toggleOperario(o.id)}
                className="flex-row items-center py-2 px-1"
              >
                <View className={`w-5 h-5 rounded border mr-3 items-center justify-center ${isDisabled ? 'opacity-40' : ''} ${selected ? 'bg-igb-yellow border-igb-yellow' : 'border-igb-outline'}`}>
                  {selected && <Ionicons name="checkmark" size={14} color={colors.onYellow} />}
                </View>
                <Text className={ocupado ? 'text-igb-error flex-1' : !o.activo ? 'text-igb-secondary flex-1' : 'text-igb-on-surface flex-1'} numberOfLines={1}>
                  {o.nombre}{ocupado ? ' (ocupado)' : ''}{!o.activo ? ' (inactivo)' : ''}
                </Text>
              </Pressable>
            )
          })}
        </View>
        {operarioIds.some((id) => ocupados.operarioIds.includes(id)) && (
          <Text className="text-igb-error text-xs mt-1">
            Uno o más operarios seleccionados ya están ocupados en ese horario.
          </Text>
        )}
      </Field>

      <Field label="Ubicación (opcional)">
        <TextInput
          editable={!locked}
          value={ubicacion}
          onChangeText={setUbicacion}
          className="border border-igb-outline rounded-lg px-4 py-3 bg-white text-igb-on-surface"
          placeholder="Dirección o referencia"
        />
      </Field>

      <Field label="Notas">
        <TextInput
          editable={!locked}
          value={notas}
          onChangeText={setNotas}
          multiline
          numberOfLines={3}
          style={{ textAlignVertical: 'top' }}
          className="border border-igb-outline rounded-lg px-4 py-3 bg-white text-igb-on-surface"
          placeholder="Notas internas (opcional)"
        />
      </Field>

      {!isEdit && (
        <Field label="Estado">
          <View className="border border-igb-outline rounded-lg bg-white">
            <Picker selectedValue={estado} onValueChange={(v) => setEstado(v as EstadoEvento)}>
              {opcionesEstado.map((e) => (
                <Picker.Item key={e} label={formatEstado(e)} value={e} />
              ))}
            </Picker>
          </View>
        </Field>
      )}

      {error && <ErrorBanner message={error} />}

      {/* ponytail: disabled: no aplica en RN Web — opacity a mano. Importa
          bien acá: con evento cancelado/finalizado (locked) el botón se
          bloquea pero antes se veía idéntico a uno activo. */}
      <Pressable
        onPress={handleSubmit}
        disabled={saving || locked}
        className={`bg-igb-yellow rounded-lg py-3.5 items-center mt-2 ${saving || locked ? 'opacity-60' : ''}`}
      >
        {saving ? <ActivityIndicator color={colors.onYellow} /> : <Text className="text-igb-on-yellow font-bold">{isEdit ? 'Guardar cambios' : 'Crear evento'}</Text>}
      </Pressable>
      {footer}
    </ScrollView>
    </KeyboardAvoidingView>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="text-igb-on-surface mb-1 font-medium">{label}</Text>
      {children}
    </View>
  )
}
