import { useEffect, useState, type ReactNode } from 'react'
import { View, ScrollView, Pressable, ActivityIndicator, Platform } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Picker } from '@react-native-picker/picker'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/Text'
import { TextInput } from '@/components/TextInput'
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
import { toDateInput, formatEstado } from '@/lib/agenda-view'
import { type EstadoEvento, type EventoAgenda, type Grua, type EmpresaAgenda, type Operario } from '@/lib/types'

// Lista de horarios en pasos de 15' (00:00..23:45) para elegir hora rápido
// tipeando/scrolleando en vez de girar la rueda del picker nativo.
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
  const locked = isEdit && initial.estado === 'en_curso'

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

  const [ocupados, setOcupados] = useState<{ gruaIds: string[]; operarioIds: string[] }>({ gruaIds: [], operarioIds: [] })
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
    getRecursosOcupados({ fecha, fechaHasta: fechaHasta || null, horaInicio, horaFin: horaFin || null, excludeEventoId: initial?.id })
      .then(setOcupados)
      .catch(() => {})
  }, [fecha, fechaHasta, horaInicio, horaFin])

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
    if (!fechaHasta && horaFin && horaFin <= horaInicio) {
      setError('La hora de fin debe ser posterior a la hora de inicio.')
      return
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
        <ActivityIndicator color="#f5d100" />
      </View>
    )
  }

  return (
    <ScrollView className="flex-1 bg-igb-surface px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
      {locked && (
        <View className="bg-igb-navy/5 border border-igb-navy/20 rounded-lg p-3 mb-4">
          <Text className="text-igb-navy text-sm">Un evento en curso solo permite cambiar el estado.</Text>
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
                {TIME_OPTIONS.map((t) => (
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
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, date) => {
            setShowPicker(null)
            if (!date) return
            if (showPicker === 'fecha') setFecha(toDateInput(date))
            else setFechaHasta(toDateInput(date))
          }}
        />
      )}

      <Field label="Grúa">
        <View className="border border-igb-outline rounded-lg bg-white">
          <Picker enabled={!locked} selectedValue={gruaId} onValueChange={setGruaId}>
            <Picker.Item label="Seleccioná una grúa" value="" />
            {gruas.map((g) => (
              <Picker.Item
                key={g.id}
                label={`${g.nombre}${ocupados.gruaIds.includes(g.id) ? ' (ocupada)' : ''}${!g.activo ? ' (inactiva)' : ''}`}
                value={g.id}
                color={ocupados.gruaIds.includes(g.id) ? '#dc2626' : !g.activo ? '#575d78' : undefined}
              />
            ))}
          </Picker>
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
          {operarios.map((o) => {
            const selected = operarioIds.includes(o.id)
            const ocupado = ocupados.operarioIds.includes(o.id)
            return (
              <Pressable
                key={o.id}
                disabled={locked}
                onPress={() => toggleOperario(o.id)}
                className="flex-row items-center py-2 px-1"
              >
                <View className={`w-5 h-5 rounded border mr-3 items-center justify-center ${selected ? 'bg-igb-yellow border-igb-yellow' : 'border-igb-outline'}`}>
                  {selected && <Ionicons name="checkmark" size={14} color="#221b00" />}
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

      <Field label="Ubicación">
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

      {error && <Text className="text-igb-error mb-3">{error}</Text>}

      <Pressable
        onPress={handleSubmit}
        disabled={saving}
        className="bg-igb-yellow rounded-lg py-3.5 items-center mt-2 disabled:opacity-60"
      >
        {saving ? <ActivityIndicator color="#221b00" /> : <Text className="text-igb-on-yellow font-bold">{isEdit ? 'Guardar cambios' : 'Crear evento'}</Text>}
      </Pressable>
      {footer}
    </ScrollView>
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
