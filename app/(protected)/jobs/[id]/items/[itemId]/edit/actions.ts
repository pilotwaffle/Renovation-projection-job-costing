'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function updateScopeItem(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const itemId = formData.get('item_id') as string
  const jobId = formData.get('job_id') as string
  const isCompleted = formData.get('is_completed') === 'on'

  const updateData: Record<string, unknown> = {
    description: formData.get('description') as string,
    estimated_material_cost: parseFloat(formData.get('estimated_material_cost') as string) || 0,
    estimated_labor_hours: parseFloat(formData.get('estimated_labor_hours') as string) || 0,
    estimated_labor_rate: parseFloat(formData.get('estimated_labor_rate') as string) || 50,
    actual_material_cost: parseFloat(formData.get('actual_material_cost') as string) || 0,
    actual_labor_hours: parseFloat(formData.get('actual_labor_hours') as string) || 0,
    notes: formData.get('notes') as string || null,
    is_completed: isCompleted,
    completed_at: isCompleted ? new Date().toISOString() : null
  }

  const { error } = await supabase
    .from('scope_items')
    .update(updateData)
    .eq('id', itemId)

  if (error) {
    console.error('Error updating scope item:', error)
    throw new Error('Failed to update scope item')
  }

  revalidatePath(`/jobs/${jobId}`)
  redirect(`/jobs/${jobId}`)
}
