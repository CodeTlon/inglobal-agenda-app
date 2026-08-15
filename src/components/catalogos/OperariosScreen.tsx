import { useCallback, useState } from 'react'
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { Text } from '@/components/Text'
import { TextInput } from '@/components/TextInput'
import { ErrorBanner } from '@/components/ErrorBanner'
import { getOperarios, createOperario, updateOperario, toggleOperario, deleteOperario, getEventosAgenda } from '@/lib/agenda-api'
import { ApiError } from '@/lib/api'
import { showApiError } from '@/lib/alert'
import { toDateInput } from '@/lib/agenda-view'
import { useAgendaSelection } from '@/lib/agenda-selection'
import type { Operario, EventoAgenda } from '@/lib/types'
import { CatalogRow, type CatalogEstado } from '@/components/CatalogRow'

const EMPTY = { nombre: '', telefono: '' }
const ESTADOS_VIVOS = ['reserva', 'programado', 'en_curso']

export default function OperariosScreen() {
  const { selectedDate } = useAgendaSelection()
  const [operarios, setOperarios] = useState<Operario[]>([])
  const [eventosDelDia, setEventosDelDia] = useState<EventoAgenda[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Operario | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    Promise.all([getOperarios(true), getEventosAgenda(selectedDate, selectedDate)])
      .then(([ops, evs]) => {
        setOperarios(ops)
        setEventosDelDia(evs)
      })
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : 'No se pudieron cargar los operarios.'))
      .finally(() => setLoading(false))
  }, [selectedDate])

  // Disponible/Ocupado según si hay un evento vivo (no cancelado/finalizado)
  // que lo tenga asignado y cubra `selectedDate` — no hay campo de
  // estado/turno propio en el catálogo. `selectedDate` es el día que se
  // estaba mirando en Agenda (o hoy, si se entró directo a Catálogos).
  function estadoDe(o: Operario): CatalogEstado | undefined {
    if (!o.activo) return undefined
    const ocupado = eventosDelDia.find((ev) => ESTADOS_VIVOS.includes(ev.estado) && ev.operarios.some((op) => op.id === o.id))
    if (!ocupado) return { kind: 'disponible' }
    return { kind: 'ocupado', detail: `Libera ~${(ocupado.hora_fin ?? '18:00').slice(0, 5)}` }
  }

  useFocusEffect(useCallback(() => { load() }, [load]))

  function openNew() {
    setEditing(null)
    setForm(EMPTY)
    setError(null)
    setShowForm(true)
  }
  function openEdit(o: Operario) {
    setEditing(o)
    setForm({ nombre: o.nombre, telefono: o.telefono ?? '' })
    setError(null)
    setShowForm(true)
  }

  function validate(): string | null {
    if (!form.nombre.trim()) return 'El nombre es obligatorio.'
    if (!form.telefono.trim()) return 'El teléfono es obligatorio.'
    return null
  }

  async function handleSave() {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (editing) await updateOperario(editing.id, form)
      else await createOperario(form)
      setShowForm(false)
      load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(o: Operario) {
    try {
      await toggleOperario(o.id, o.activo)
      load()
    } catch (err) {
      showApiError(err, 'No se pudo actualizar.', 'No se pudo actualizar el operario')
    }
  }

  async function handleDelete(o: Operario) {
    try {
      await deleteOperario(o.id)
      load()
    } catch (err) {
      showApiError(err, 'No se pudo eliminar.', 'No se pudo eliminar el operario')
    }
  }

  if (showForm) {
    return (
      <ScrollView className="flex-1 bg-igb-surface px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="text-igb-on-surface mb-1 font-medium">Nombre</Text>
        <TextInput value={form.nombre} onChangeText={(v) => setForm((f) => ({ ...f, nombre: v }))} className="border border-igb-outline rounded-lg px-4 py-3 mb-4 bg-white text-igb-on-surface" placeholder="Nombre y apellido" />

        <Text className="text-igb-on-surface mb-1 font-medium">Teléfono</Text>
        <TextInput value={form.telefono} onChangeText={(v) => setForm((f) => ({ ...f, telefono: v }))} keyboardType="phone-pad" className="border border-igb-outline rounded-lg px-4 py-3 mb-4 bg-white text-igb-on-surface" placeholder="011 1234-5678" />

        {error && <ErrorBanner message={error} />}

        <Pressable onPress={handleSave} disabled={saving} className="bg-igb-yellow rounded-lg py-3.5 items-center mb-3 disabled:opacity-60">
          {saving ? <ActivityIndicator color="#221b00" /> : <Text className="text-igb-on-yellow font-bold">Guardar</Text>}
        </Pressable>
        <Pressable onPress={() => setShowForm(false)} className="items-center py-2">
          <Text className="text-igb-secondary">Cancelar</Text>
        </Pressable>
      </ScrollView>
    )
  }

  return (
    <View className="flex-1 bg-igb-surface">
      {loading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color="#f5d100" /></View>
      ) : loadError ? (
        <View className="flex-1 items-center px-4 pt-8">
          <Text className="text-igb-error text-center">{loadError}</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-4 pt-4">
          {selectedDate !== toDateInput(new Date()) && (
            <Text className="text-igb-secondary text-xs mb-3">
              Estado al {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          )}
          {operarios.map((o) => (
            <CatalogRow
              key={o.id}
              icon="people-outline"
              title={o.nombre}
              subtitle={o.telefono}
              activo={o.activo}
              estado={estadoDe(o)}
              onToggle={() => handleToggle(o)}
              onEdit={() => openEdit(o)}
              onDelete={() => handleDelete(o)}
            />
          ))}
          <View className="h-24" />
        </ScrollView>
      )}
      <Pressable onPress={openNew} className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-igb-yellow items-center justify-center shadow-lg">
        <Text className="text-2xl text-igb-on-yellow">+</Text>
      </Pressable>
    </View>
  )
}
