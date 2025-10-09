'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function createJob(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const jobData = {
    user_id: user.id,
    name: formData.get('name') as string,
    client_name: formData.get('client_name') as string || null,
    address: formData.get('address') as string || null,
    status: 'active' as const
  }

  const { data: job, error } = await supabase
    .from('jobs')
    .insert(jobData)
    .select()
    .single()

  if (error) {
    console.error('Error creating job:', error)
    throw new Error('Failed to create job')
  }

  // Create initial budget version
  await supabase
    .from('budget_versions')
    .insert({
      job_id: job.id,
      version: 1,
      created_by: user.id,
      notes: 'Initial budget'
    })

  revalidatePath('/jobs')
  redirect(`/jobs/${job.id}`)
}
