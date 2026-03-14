import { redirect } from 'next/navigation'

// Redirecionar a raiz para o dashboard
export default function PaginaRaiz() {
  redirect('/dashboard')
}
