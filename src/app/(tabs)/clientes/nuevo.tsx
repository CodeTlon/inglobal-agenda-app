import { useRouter } from 'expo-router'
import { ClienteForm } from '@/components/ClienteForm'

export default function NuevoClienteScreen() {
  const router = useRouter()
  return <ClienteForm onDone={() => router.back()} />
}
