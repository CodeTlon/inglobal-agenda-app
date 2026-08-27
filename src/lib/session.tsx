import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

type SessionState = { session: Session | null; loading: boolean; mustChangePassword: boolean }

const SessionContext = createContext<SessionState | null>(null)

// Antes `useSession()` era un hook "suelto": cada pantalla que lo llamaba
// (_layout.tsx, (tabs)/_layout.tsx, perfil/index.tsx) montaba su propia
// suscripción a onAuthStateChange y su propio getSession() al iniciar — sin
// leak (cada uno limpia su propio listener) pero sí triplicando el trabajo
// en cada evento de auth. Un solo Provider en la raíz resuelve la sesión una
// vez y la comparte.
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session)
      })
      .catch(() => {
        setSession(null)
        supabase.auth.signOut({ scope: 'local' }).catch(() => {})
      })
      .finally(() => {
        setLoading(false)
      })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value: SessionState = {
    session,
    loading,
    mustChangePassword: session?.user.user_metadata?.must_change_password === true,
  }
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession debe usarse dentro de <SessionProvider>')
  return ctx
}
