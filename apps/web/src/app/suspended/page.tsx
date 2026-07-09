import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Cuenta suspendida — ARGYM' }

export default async function SuspendedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, tenant_id')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="text-6xl">⚠️</div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Cuenta suspendida
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {profile?.full_name ? `Hola ${profile.full_name.split(' ')[0]}, ` : ''}
            el acceso a tu gimnasio ha sido suspendido por falta de pago de la suscripción de plataforma.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-left space-y-3">
          <h2 className="font-semibold text-gray-900 dark:text-white">¿Qué puedes hacer?</h2>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex gap-2">
              <span>1.</span>
              <span>Contacta a soporte de ARGYM para regularizar tu pago.</span>
            </li>
            <li className="flex gap-2">
              <span>2.</span>
              <span>Una vez confirmado el pago, tu cuenta se reactiva automáticamente.</span>
            </li>
            <li className="flex gap-2">
              <span>3.</span>
              <span>Todos tus datos, clientes y configuraciones se conservan.</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <a
            href="mailto:soporte@argym.app?subject=Reactivar%20cuenta%20suspendida"
            className="inline-flex items-center justify-center w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Contactar soporte de ARGYM
          </a>
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
