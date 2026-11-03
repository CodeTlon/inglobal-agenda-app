import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { AppState } from 'react-native'
import { loadSessionRapida, onAuthChange, signOut, type AuthSession } from './auth'

type SessionState = { session: AuthSession | null; loading: boolean; mustChangePassword: boolean }

const SessionContext = createContext<SessionState | null>(null)

// Un solo Provider en la raíz resuelve la sesión una vez y la comparte con todas
// las pantallas (en vez de que cada una la valide por su cuenta).
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let vivo = true
    let resuelta = false
    let enCurso = false

    const cargar = () => {
      if (resuelta || enCurso) return
      enCurso = true
      loadSessionRapida()
        .then((s) => {
          if (!vivo || resuelta) return
          resuelta = true
          setSession(s)
          setLoading(false)
        })
        .catch(() => {
          // No se pudo leer el token (iOS con el teléfono bloqueado, app lanzada en segundo plano) o no se
          // pudo validar y no hay usuario guardado. El token sigue guardado: NO es "sin sesión". Si la app está
          // a la vista se muestra el login (por si de verdad no hay red), y se reintenta al volver a primer
          // plano; si está en segundo plano se queda cargando hasta que el usuario la abra.
          if (vivo && AppState.currentState === 'active') setLoading(false)
        })
        .finally(() => {
          enCurso = false
        })
    }

    cargar()
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') cargar()
    })
    const off = onAuthChange((s) => {
      resuelta = true
      setSession(s)
      setLoading(false)
    })
    return () => {
      vivo = false
      sub.remove()
      off()
    }
  }, [])

  const value: SessionState = {
    session,
    loading,
    mustChangePassword: session?.user.mustChangePassword === true,
  }
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession debe usarse dentro de <SessionProvider>')
  return ctx
}

export { signOut }
