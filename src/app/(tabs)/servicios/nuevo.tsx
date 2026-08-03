import { useRouter } from 'expo-router'
import { ServicioForm } from '@/components/ServicioForm'

export default function NuevoServicioScreen() {
  const router = useRouter()
  return <ServicioForm onDone={() => router.back()} />
}
