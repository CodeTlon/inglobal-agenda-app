import { useRouter } from 'expo-router'
import { EventoForm } from '@/components/EventoForm'

export default function NuevoEventoScreen() {
  const router = useRouter()
  return <EventoForm onDone={() => router.back()} />
}
