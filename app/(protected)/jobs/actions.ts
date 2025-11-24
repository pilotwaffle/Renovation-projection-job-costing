'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function deleteJobAction(jobId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Verify ownership before deleting
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('user_id')
    .eq('id', jobId)
    .single()

  if (jobError || !job) {
    throw new Error('Job not found')
  }

  if (job.user_id !== user.id) {
    throw new Error('Not authorized to delete this job')
  }

  // Delete the job (cascade will handle related records due to foreign key constraints)
  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', jobId)

  if (error) {
    throw new Error('Failed to delete job: ' + error.message)
  }

  revalidatePath('/jobs')
  revalidatePath('/dashboard')
  redirect('/jobs')
}

export async function deleteScopeItemAction(itemId: string, jobId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Verify ownership through budget_version and job
  const { data: item, error: itemError } = await supabase
    .from('scope_items')
    .select(`
      id,
      budget_version:budget_versions!inner (
        job:jobs!inner (
          user_id
        )
      )
    `)
    .eq('id', itemId)
    .single()

  if (itemError || !item) {
    throw new Error('Scope item not found')
  }

  const budgetVersion = Array.isArray(item.budget_version) ? item.budget_version[0] : item.budget_version
  const job = budgetVersion && Array.isArray(budgetVersion.job) ? budgetVersion.job[0] : budgetVersion?.job

  if (job && 'user_id' in job && job.user_id !== user.id) {
    throw new Error('Not authorized to delete this scope item')
  }

  // Delete the scope item
  const { error } = await supabase
    .from('scope_items')
    .delete()
    .eq('id', itemId)

  if (error) {
    throw new Error('Failed to delete scope item: ' + error.message)
  }

  revalidatePath(`/jobs/${jobId}`)
  return { success: true }
}
