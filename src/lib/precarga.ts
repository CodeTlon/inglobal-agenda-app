import { Image } from 'expo-image'
import { getGruas, getEmpresasAgenda, getOperarios } from './agenda-api'

// Tope: si la red anda mal, la pantalla de carga no puede quedarse esperando fotos para siempre.
const TOPE_MS = 4000
// Pasado un rato desde la última precarga se vuelve a pedir la lista (las fotos nuevas tienen URL nueva).
const VIGENCIA_MS = 30_000

let ultima = 0
let pendiente: Promise<void> | null = null

const seguro = <T,>(p: Promise<T[]>) => p.catch(() => [] as T[])

/**
 * Baja el listado de grúas, empresas y operarios y deja sus fotos en el caché de disco de expo-image
 * (el mismo que usa CatalogRow con `cachePolicy="disk"`), para que las pantallas de Catálogos abran con
 * las fotos ya puestas. Nunca rechaza ni espera más de `TOPE_MS`.
 */
export function precargarFotos(): Promise<void> {
  if (Date.now() - ultima < VIGENCIA_MS) return Promise.resolve()
  if (pendiente) return pendiente

  const trabajo = (async () => {
    const [gruas, empresas, operarios] = await Promise.all([
      seguro(getGruas()),
      seguro(getEmpresasAgenda()),
      seguro(getOperarios()),
    ])
    const urls = [...gruas.map((g) => g.foto_url), ...empresas.map((e) => e.logo_url), ...operarios.map((o) => o.foto_url)].filter(
      (u): u is string => !!u,
    )
    if (urls.length) await Image.prefetch(urls, 'disk')
  })().catch(() => {})
  const tope = new Promise<void>((resolve) => setTimeout(resolve, TOPE_MS))

  pendiente = Promise.race([trabajo, tope]).finally(() => {
    ultima = Date.now()
    pendiente = null
  })
  return pendiente
}
