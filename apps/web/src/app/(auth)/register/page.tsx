import { createClient } from '@/lib/supabase/server'
import { GymPicker } from '../_components/gym-picker'

export default async function RegisterPage() {
  const supabase = await createClient()

  const { data: gyms } = await supabase
    .from('tenants')
    .select('slug, name, logo_url')
    .eq('is_active', true)
    .order('name')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          ¿A qué gimnasio vas?
        </h1>
        <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
          Elegí el gimnasio para crear tu cuenta.
        </p>
      </div>

      <GymPicker gyms={gyms ?? []} mode="register" />
    </div>
  )
}
