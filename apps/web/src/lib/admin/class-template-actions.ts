'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

interface ClassTemplateInput {
  name: string
  branch_id: string
  coach_id: string | null
  day_of_week: number
  start_time: string
  end_time: string
  max_participants: number
  grace_hours_override: number | null
}

export async function createClassTemplateAction(data: ClassTemplateInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const { error } = await supabase
    .from('class_templates')
    .insert({
      tenant_id: profile!.tenant_id,
      name: data.name,
      branch_id: data.branch_id,
      coach_id: data.coach_id,
      day_of_week: data.day_of_week,
      start_time: data.start_time,
      end_time: data.end_time,
      max_participants: data.max_participants,
      grace_hours_override: data.grace_hours_override,
    })

  if (error) return { error: error.message }
  revalidatePath('/admin/clases')
  return { success: true }
}

export async function updateClassTemplateAction(templateId: string, data: ClassTemplateInput) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('class_templates')
    .update({
      name: data.name,
      branch_id: data.branch_id,
      coach_id: data.coach_id,
      day_of_week: data.day_of_week,
      start_time: data.start_time,
      end_time: data.end_time,
      max_participants: data.max_participants,
      grace_hours_override: data.grace_hours_override,
    })
    .eq('id', templateId)

  if (error) return { error: error.message }
  revalidatePath('/admin/clases')
  return { success: true }
}

export async function toggleClassTemplateActiveAction(templateId: string, isActive: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('class_templates')
    .update({ is_active: isActive })
    .eq('id', templateId)

  if (error) return { error: error.message }
  revalidatePath('/admin/clases')
  return { success: true }
}

export async function deleteClassTemplateAction(templateId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('class_templates')
    .delete()
    .eq('id', templateId)

  if (error) return { error: error.message }
  revalidatePath('/admin/clases')
  return { success: true }
}
