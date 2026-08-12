import { createContext, useContext, useState, type ReactNode } from 'react'
import { toDateInput } from './agenda-view'

const AgendaSelectionContext = createContext<{
  selectedDate: string
  setSelectedDate: (d: string) => void
} | null>(null)

// Comparte el día que el usuario tenía resaltado en Agenda con las pantallas
// de Catálogos (Grúas/Operarios) — el badge Ocupado/Disponible ahí depende
// de qué día se está mirando, no siempre "hoy". Default hoy si todavía no
// se visitó Agenda en esta sesión.
export function AgendaSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState(() => toDateInput(new Date()))
  return (
    <AgendaSelectionContext.Provider value={{ selectedDate, setSelectedDate }}>
      {children}
    </AgendaSelectionContext.Provider>
  )
}

export function useAgendaSelection() {
  const ctx = useContext(AgendaSelectionContext)
  if (!ctx) throw new Error('useAgendaSelection debe usarse dentro de AgendaSelectionProvider')
  return ctx
}
