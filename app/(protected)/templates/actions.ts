'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { BudgetTemplate, TemplateItem, BudgetTemplateWithItems } from '@/lib/types'

/**
 * Get all templates for the current user
 */
export async function getTemplatesAction() {
  const supabase = await createClient()

  const { data: user } = await supabase.auth.getUser()
  if (!user.user) {
    throw new Error('Not authenticated')
  }

  const { data: templates, error } = await supabase
    .from('budget_templates')
    .select(`
      *,
      template_items:template_items (
        *,
        category:categories (*)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching templates:', error)
    throw new Error('Failed to fetch templates')
  }

  // Calculate estimated total for each template
  const templatesWithTotals = templates?.map(template => {
    const estimated_total = template.template_items?.reduce((sum: number, item: any) => {
      return sum + (item.estimated_material_cost || 0) +
        ((item.estimated_labor_hours || 0) * (item.estimated_labor_rate || 0))
    }, 0) || 0

    return {
      ...template,
      estimated_total
    }
  })

  return templatesWithTotals as BudgetTemplateWithItems[]
}

/**
 * Get a single template by ID
 */
export async function getTemplateByIdAction(templateId: string) {
  const supabase = await createClient()

  const { data: template, error } = await supabase
    .from('budget_templates')
    .select(`
      *,
      template_items:template_items (
        *,
        category:categories (*)
      )
    `)
    .eq('id', templateId)
    .single()

  if (error) {
    console.error('Error fetching template:', error)
    throw new Error('Failed to fetch template')
  }

  // Calculate estimated total
  const estimated_total = template.template_items?.reduce((sum: number, item: any) => {
    return sum + (item.estimated_material_cost || 0) +
      ((item.estimated_labor_hours || 0) * (item.estimated_labor_rate || 0))
  }, 0) || 0

  return {
    ...template,
    estimated_total
  } as BudgetTemplateWithItems
}

/**
 * Create a new template from a budget version
 */
export async function createTemplateFromBudgetAction(
  budgetVersionId: string,
  name: string,
  description?: string
) {
  const supabase = await createClient()

  const { data: user } = await supabase.auth.getUser()
  if (!user.user) {
    throw new Error('Not authenticated')
  }

  // Get all scope items from the budget version
  const { data: scopeItems, error: scopeError } = await supabase
    .from('scope_items')
    .select('*')
    .eq('budget_version_id', budgetVersionId)
    .order('created_at', { ascending: true })

  if (scopeError) {
    console.error('Error fetching scope items:', scopeError)
    throw new Error('Failed to fetch scope items')
  }

  // Create the template
  const { data: template, error: templateError } = await supabase
    .from('budget_templates')
    .insert({
      user_id: user.user.id,
      name,
      description: description || null
    })
    .select()
    .single()

  if (templateError) {
    console.error('Error creating template:', templateError)
    throw new Error('Failed to create template')
  }

  // Create template items from scope items
  const templateItems = scopeItems.map((item, index) => ({
    template_id: template.id,
    category_id: item.category_id,
    description: item.description,
    estimated_material_cost: item.estimated_material_cost,
    estimated_labor_hours: item.estimated_labor_hours,
    estimated_labor_rate: item.estimated_labor_rate,
    notes: item.notes,
    sort_order: index
  }))

  const { error: itemsError } = await supabase
    .from('template_items')
    .insert(templateItems)

  if (itemsError) {
    console.error('Error creating template items:', itemsError)
    // Rollback: delete the template
    await supabase.from('budget_templates').delete().eq('id', template.id)
    throw new Error('Failed to create template items')
  }

  revalidatePath('/templates')
  return template as BudgetTemplate
}

/**
 * Create a budget version from a template
 */
export async function createBudgetFromTemplateAction(
  templateId: string,
  jobId: string
) {
  const supabase = await createClient()

  const { data: user } = await supabase.auth.getUser()
  if (!user.user) {
    throw new Error('Not authenticated')
  }

  // Get template items
  const { data: templateItems, error: itemsError } = await supabase
    .from('template_items')
    .select('*')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: true })

  if (itemsError) {
    console.error('Error fetching template items:', itemsError)
    throw new Error('Failed to fetch template items')
  }

  // Get the job to check ownership
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (jobError || !job) {
    throw new Error('Job not found')
  }

  // Get existing budget versions for this job to determine next version number
  const { data: existingVersions } = await supabase
    .from('budget_versions')
    .select('version')
    .eq('job_id', jobId)
    .order('version', { ascending: false })
    .limit(1)

  const nextVersion = existingVersions && existingVersions.length > 0
    ? existingVersions[0].version + 1
    : 1

  // Create new budget version
  const { data: budgetVersion, error: budgetError } = await supabase
    .from('budget_versions')
    .insert({
      job_id: jobId,
      version: nextVersion,
      notes: `Created from template`,
      created_by: user.user.id
    })
    .select()
    .single()

  if (budgetError) {
    console.error('Error creating budget version:', budgetError)
    throw new Error('Failed to create budget version')
  }

  // Create scope items from template items
  const scopeItems = templateItems.map(item => ({
    budget_version_id: budgetVersion.id,
    category_id: item.category_id,
    description: item.description,
    estimated_material_cost: item.estimated_material_cost,
    estimated_labor_hours: item.estimated_labor_hours,
    estimated_labor_rate: item.estimated_labor_rate,
    notes: item.notes,
    actual_material_cost: 0,
    actual_labor_hours: 0,
    is_completed: false
  }))

  const { error: scopeError } = await supabase
    .from('scope_items')
    .insert(scopeItems)

  if (scopeError) {
    console.error('Error creating scope items:', scopeError)
    // Rollback: delete the budget version
    await supabase.from('budget_versions').delete().eq('id', budgetVersion.id)
    throw new Error('Failed to create scope items')
  }

  // Increment template use count
  await supabase
    .from('budget_templates')
    .update({ use_count: (await supabase.from('budget_templates').select('use_count').eq('id', templateId).single()).data?.use_count || 0 + 1 })
    .eq('id', templateId)

  revalidatePath(`/jobs/${jobId}`)
  return budgetVersion
}

/**
 * Delete a template
 */
export async function deleteTemplateAction(templateId: string) {
  const supabase = await createClient()

  const { data: user } = await supabase.auth.getUser()
  if (!user.user) {
    throw new Error('Not authenticated')
  }

  // Check ownership
  const { data: template } = await supabase
    .from('budget_templates')
    .select('user_id')
    .eq('id', templateId)
    .single()

  if (!template || template.user_id !== user.user.id) {
    throw new Error('Not authorized to delete this template')
  }

  const { error } = await supabase
    .from('budget_templates')
    .delete()
    .eq('id', templateId)

  if (error) {
    console.error('Error deleting template:', error)
    throw new Error('Failed to delete template')
  }

  revalidatePath('/templates')
  return { success: true }
}

/**
 * Update a template
 */
export async function updateTemplateAction(
  templateId: string,
  name: string,
  description?: string
) {
  const supabase = await createClient()

  const { data: user } = await supabase.auth.getUser()
  if (!user.user) {
    throw new Error('Not authenticated')
  }

  const { data: template, error } = await supabase
    .from('budget_templates')
    .update({
      name,
      description: description || null
    })
    .eq('id', templateId)
    .eq('user_id', user.user.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating template:', error)
    throw new Error('Failed to update template')
  }

  revalidatePath('/templates')
  revalidatePath(`/templates/${templateId}`)
  return template as BudgetTemplate
}
