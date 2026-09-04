import { confirmDialog } from '@/components/Dialog'
import { ApiError } from './api'

/**
 * Alert de error consistente en toda la app: si es un ApiError usa el mensaje que
 * ya viene en castellano desde el backend (friendlyError del lado del server),
 * si no, el fallback. Título contextual en vez de siempre "Error" a secas.
 */
export function showApiError(e: unknown, fallback: string, title = 'No se pudo completar la acción') {
  confirmDialog(title, e instanceof ApiError ? e.message : fallback)
}
