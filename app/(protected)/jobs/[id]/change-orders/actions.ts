'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ChangeOrder } from '@/lib/types'

export async function createChangeOrderAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const jobId = formData.get('job_id') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string

  // Verify job ownership
  const { data: job } = await supabase
    .from('jobs')
    .select('user_id')
    .eq('id', jobId)
    .single()

  if (!job || job.user_id !== user.id) {
    throw new Error('Not authorized')
  }

  const { data, error } = await supabase
    .from('change_orders')
    .insert({
      job_id: jobId,
      title,
      description,
      requested_by: user.id,
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    throw new Error('Failed to create change order: ' + error.message)
  }

  revalidatePath(`/jobs/${jobId}`)
  redirect(`/jobs/${jobId}/change-orders/${data.id}`)
}

export async function getChangeOrdersAction(jobId: string): Promise<ChangeOrder[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data, error } = await supabase
    .from('change_orders')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching change orders:', error)
    return []
  }

  return data || []
}

export async function approveChangeOrderAction(changeOrderId: string, jobId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { error } = await supabase
    .from('change_orders')
    .update({
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString()
    })
    .eq('id', changeOrderId)

  if (error) {
    throw new Error('Failed to approve change order: ' + error.message)
  }

  revalidatePath(`/jobs/${jobId}`)
  return { success: true }
}

export async function rejectChangeOrderAction(changeOrderId: string, jobId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { error } = await supabase
    .from('change_orders')
    .update({
      status: 'rejected',
      approved_by: user.id,
      approved_at: new Date().toISOString()
    })
    .eq('id', changeOrderId)

  if (error) {
    throw new Error('Failed to reject change order: ' + error.message)
  }

  revalidatePath(`/jobs/${jobId}`)
  return { success: true }
}

export async function addChangeOrderItemAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const changeOrderId = formData.get('change_order_id') as string
  const changeType = formData.get('change_type') as 'add' | 'modify' | 'remove'
  const description = formData.get('description') as string
  const costImpact = parseFloat(formData.get('cost_impact') as string) || 0

  const { error } = await supabase
    .from('change_order_items')
    .insert({
      change_order_id: changeOrderId,
      change_type: changeType,
      description,
      cost_impact: costImpact
    })

  if (error) {
    throw new Error('Failed to add change order item: ' + error.message)
  }

  // Update total impact on change order
  const { data: items } = await supabase
    .from('change_order_items')
    .select('cost_impact')
    .eq('change_order_id', changeOrderId)

  const totalImpact = (items || []).reduce((sum, item) => sum + item.cost_impact, 0)

  await supabase
    .from('change_orders')
    .update({ impact_amount: totalImpact })
    .eq('id', changeOrderId)

  return { success: true }
}
