import { useCallback, useState } from 'react'
import { View, ScrollView, Pressable, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { Text } from '@/components/Text'
import { TextInput } from '@/components/TextInput'
import { ErrorBanner } from '@/components/ErrorBanner'
import { getEmpresasAgenda, createEmpresaAgenda, toggleEmpresaAgenda } from '@/lib/agenda-api'
import { ApiError } from '@/lib/api'
import { showApiError } from '@/lib/alert'
import type { EmpresaAgenda } from '@/lib/types'
import { CatalogRow } from '@/components/CatalogRow'

const EMPTY = { nombre: '', contacto: '', telefono: '', notas: '' }

export default function EmpresasScreen() {
  const router = useRouter()
  const [empresas, setEmpresas] = useState<EmpresaAgenda[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    getEmpresasAgenda(true)
      .then(setEmpresas)
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : 'No se pudieron cargar las empresas.'))
      .finally(() => setLoading(false))
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  // Editar una empresa existente vive en su pantalla de detalle, no acá —
  // este form solo se usa para dar de alta una nueva.
  function openNew() {
    setForm(EMPTY)
    setError(null)
    setShowForm(true)
  }

  function validate(): string | null {
    if (!form.nombre.trim()) return 'El nombre es obligatorio.'
    if (!form.contacto.trim()) return 'El contacto es obligatorio.'
    if (!form.telefono.trim()) return 'El teléfono es obligatorio.'
    // Mismo formato que valida el backend (empresaAgendaSchema en
    // inglobal-site/lib/validations/agenda.ts).
    if (!/^[\d\s()+-]+$/.test(form.telefono)) return 'El teléfono tiene caracteres inválidos.'
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
      const payload = { nombre: form.nombre, contacto: form.contacto, telefono: form.telefono, notas: form.notas || null }
      await createEmpresaAgenda(payload)
      setShowForm(false)
      load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(e: EmpresaAgenda) {
    try {
      // El backend espera el valor ACTUAL y lo invierte él mismo (mismo
      // contrato que /api/agenda/{gruas,empresas,operarios}/[id] en
      // inglobal-site, ver catalogToggle en lib/agenda-business.ts) — NO
      // mandar ya negado.
      await toggleEmpresaAgenda(e.id, e.activo)
      load()
    } catch (err) {
      showApiError(err, 'No se pudo actualizar.', 'No se pudo actualizar la empresa')
    }
  }

  if (showForm) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
      <ScrollView className="flex-1 bg-igb-surface px-4 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="text-igb-on-surface mb-1 font-medium">Nombre</Text>
        <TextInput value={form.nombre} onChangeText={(v) => setForm((f) => ({ ...f, nombre: v }))} className="border border-igb-outline rounded-lg px-4 py-3 mb-4 bg-white text-igb-on-surface" placeholder="Ej: Transportes SRL" />

        <Text className="text-igb-on-surface mb-1 font-medium">Contacto</Text>
        <TextInput value={form.contacto} onChangeText={(v) => setForm((f) => ({ ...f, contacto: v }))} className="border border-igb-outline rounded-lg px-4 py-3 mb-4 bg-white text-igb-on-surface" placeholder="Nombre del contacto" />

        <Text className="text-igb-on-surface mb-1 font-medium">Teléfono</Text>
        <TextInput value={form.telefono} onChangeText={(v) => setForm((f) => ({ ...f, telefono: v }))} keyboardType="phone-pad" className="border border-igb-outline rounded-lg px-4 py-3 mb-4 bg-white text-igb-on-surface" placeholder="011 1234-5678" />

        <Text className="text-igb-on-surface mb-1 font-medium">Notas</Text>
        <TextInput value={form.notas} onChangeText={(v) => setForm((f) => ({ ...f, notas: v }))} multiline numberOfLines={3} style={{ textAlignVertical: 'top' }} className="border border-igb-outline rounded-lg px-4 py-3 mb-4 bg-white text-igb-on-surface" placeholder="Opcional" />

        {error && <ErrorBanner message={error} />}

        <Pressable onPress={handleSave} disabled={saving} className="bg-igb-yellow rounded-lg py-3.5 items-center mb-3 disabled:opacity-60">
          {saving ? <ActivityIndicator color="#221b00" /> : <Text className="text-igb-on-yellow font-bold">Guardar</Text>}
        </Pressable>
        <Pressable onPress={() => setShowForm(false)} className="items-center py-2">
          <Text className="text-igb-secondary">Cancelar</Text>
        </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>
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
          {[...empresas].sort((a, b) => Number(b.activo) - Number(a.activo)).map((e) => (
            <CatalogRow
              key={e.id}
              icon="business-outline"
              fotoUrl={e.logo_url}
              title={e.nombre}
              subtitle={[e.contacto, e.telefono].filter(Boolean).join(' — ')}
              activo={e.activo}
              onToggle={() => handleToggle(e)}
              onOpenDetail={() => router.push(`/catalogos/recurso/empresas/${e.id}`)}
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
