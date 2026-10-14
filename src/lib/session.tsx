import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { loadSession, onAuthChange, signOut, type AuthSession } from './auth'

type SessionState = { session: AuthSession | null; loading: boolean; mustChangePassword: boolean }

const SessionContext = createContext<SessionState | null>(null)

// Un solo Provider en la raíz resuelve la sesión una vez y la comparte con todas
// las pantallas (en vez de que cada una la valide por su cuenta).
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSession()
      .then(setSession)
      .catch(() => {
        // Sin red al abrir la app: no se puede validar. Se arranca sin sesión
        // (el token queda guardado y se reintenta en el próximo arranque).
        setSession(null)
      })
      .finally(() => setLoading(false))
    return onAuthChange(setSession)
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
