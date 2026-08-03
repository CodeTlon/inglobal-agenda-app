import { useEffect, useState } from 'react'
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, Platform } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Picker } from '@react-native-picker/picker'
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
import { toDateInput } from '@/lib/agenda-view'
import { TRANSICIONES_VALIDAS, type EstadoEvento, type EventoAgenda, type Grua, type EmpresaAgenda, type Operario } from '@/lib/types'

function parseTime(t: string): Date {
  const [h, m] = t.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d
}
function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function EventoForm({ initial, onDone }: { initial?: EventoAgenda; onDone: () => void }) {
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
  const [showPicker, setShowPicker] = useState<null | 'fecha' | 'fechaHasta' | 'horaInicio' | 'horaFin'>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getGruas(false), getEmpresasAgenda(false), getOperarios(false)])
      .then(([g, e, o]) => {
        setGruas(g)
        setEmpresas(e)
        setOperarios(o)
      })
      .catch(() => setError('No se pudieron cargar los catálogos.'))
      .finally(() => setLoadingCatalogos(false))
  }, [])

  useEffect(() => {
    if (!fecha || !horaInicio) return
    getRecursosOcupados({ fecha, fechaHasta: fechaHasta || null, horaInicio, horaFin: horaFin || null, excludeEventoId: initial?.id })
      .then(setOcupados)
      .catch(() => {})
  }, [fecha, fechaHasta, horaInicio, horaFin])

  const opcionesEstado: EstadoEvento[] = isEdit ? [initial.estado, ...TRANSICIONES_VALIDAS[initial.estado]] : ['programado']

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
        <View className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <Text className="text-blue-700 text-sm">Un evento en curso solo permite cambiar el estado.</Text>
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
            <Pressable disabled={locked} onPress={() => setShowPicker('horaInicio')} className="border border-igb-outline rounded-lg px-4 py-3 bg-white">
              <Text className="text-igb-on-surface">{horaInicio}</Text>
            </Pressable>
          </Field>
        </View>
        <View className="flex-1">
          <Field label="Hora de fin (opcional)">
            <Pressable disabled={locked} onPress={() => setShowPicker('horaFin')} className="border border-igb-outline rounded-lg px-4 py-3 bg-white">
              <Text className="text-igb-on-surface">{horaFin || 'Sin definir'}</Text>
            </Pressable>
          </Field>
        </View>
      </View>

      {showPicker && (
        <DateTimePicker
          value={
            showPicker === 'fecha' ? new Date(fecha)
            : showPicker === 'fechaHasta' ? new Date(fechaHasta || fecha)
            : showPicker === 'horaInicio' ? parseTime(horaInicio)
            : parseTime(horaFin || horaInicio)
          }
          mode={showPicker === 'fecha' || showPicker === 'fechaHasta' ? 'date' : 'time'}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, date) => {
            setShowPicker(null)
            if (!date) return
            if (showPicker === 'fecha') setFecha(toDateInput(date))
            else if (showPicker === 'fechaHasta') setFechaHasta(toDateInput(date))
            else if (showPicker === 'horaInicio') setHoraInicio(formatTime(date))
            else setHoraFin(formatTime(date))
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
                label={ocupados.gruaIds.includes(g.id) ? `${g.nombre} (ocupada)` : g.nombre}
                value={g.id}
                color={ocupados.gruaIds.includes(g.id) ? '#b91c1c' : undefined}
              />
            ))}
          </Picker>
        </View>
      </Field>

      <Field label="Empresa">
        <View className="border border-igb-outline rounded-lg bg-white">
          <Picker enabled={!locked} selectedValue={empresaId} onValueChange={setEmpresaId}>
            <Picker.Item label="Seleccioná una empresa" value="" />
            {empresas.map((e) => (
              <Picker.Item key={e.id} label={e.nombre} value={e.id} />
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
                  {selected && <Text className="text-igb-on-yellow text-xs">✓</Text>}
                </View>
                <Text className={ocupado ? 'text-red-600' : 'text-igb-on-surface'}>
                  {o.nombre}{ocupado ? ' (ocupado)' : ''}
                </Text>
              </Pressable>
            )
          })}
        </View>
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
          className="border border-igb-outline rounded-lg px-4 py-3 bg-white text-igb-on-surface"
          placeholder="Notas internas (opcional)"
        />
      </Field>

      {isEdit && (
        <Field label="Estado">
          <View className="border border-igb-outline rounded-lg bg-white">
            <Picker selectedValue={estado} onValueChange={(v) => setEstado(v as EstadoEvento)}>
              {opcionesEstado.map((e) => (
                <Picker.Item key={e} label={e} value={e} />
              ))}
            </Picker>
          </View>
        </Field>
      )}

      {error && <Text className="text-red-600 mb-3">{error}</Text>}

      <Pressable
        onPress={handleSubmit}
        disabled={saving}
        className="bg-igb-yellow rounded-lg py-3.5 items-center mt-2 disabled:opacity-60"
      >
        {saving ? <ActivityIndicator color="#221b00" /> : <Text className="text-igb-on-yellow font-bold">{isEdit ? 'Guardar cambios' : 'Crear evento'}</Text>}
      </Pressable>
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
