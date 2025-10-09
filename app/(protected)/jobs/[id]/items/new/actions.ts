'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createScopeItem(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const jobId = formData.get('job_id') as string

  // Get the latest budget version for this job
  const { data: budgetVersions } = await supabase
    .from('budget_versions')
    .select('id')
    .eq('job_id', jobId)
    .order('version', { ascending: false })
    .limit(1)

  if (!budgetVersions || budgetVersions.length === 0) {
    throw new Error('No budget version found for this job')
  }

  const budgetVersionId = budgetVersions[0].id

  const itemData = {
    budget_version_id: budgetVersionId,
    category_id: formData.get('category_id') as string || null,
    description: formData.get('description') as string,
    estimated_material_cost: parseFloat(formData.get('estimated_material_cost') as string) || 0,
    estimated_labor_hours: parseFloat(formData.get('estimated_labor_hours') as string) || 0,
    estimated_labor_rate: parseFloat(formData.get('estimated_labor_rate') as string) || 50,
    actual_material_cost: 0,
    actual_labor_hours: 0
  }

  const { error } = await supabase
    .from('scope_items')
    .insert(itemData)

  if (error) {
    console.error('Error creating scope item:', error)
    throw new Error('Failed to create scope item')
  }

  revalidatePath(`/jobs/${jobId}`)
  redirect(`/jobs/${jobId}`)
}
