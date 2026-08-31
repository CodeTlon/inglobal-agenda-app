import { Redirect } from 'expo-router'
import { useSession } from '@/lib/session'

// El grupo (auth) expone /login y (tabs) expone /agenda, pero nada mapea la
// URL raíz "/" — en web (o compartiendo el link pelado) caía en "Unmatched
// Route". Esta pantalla solo redirige al destino correcto.
export default function Index() {
  const { session } = useSession()
  return <Redirect href={session ? '/agenda' : '/login'} />
}
