'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CSVScopeItem {
  description: string
  category: string
  estimated_material_cost: number
  estimated_labor_hours: number
  estimated_labor_rate: number
  notes?: string
}

export interface ImportResult {
  success: boolean
  imported: number
  errors: Array<{ row: number; message: string }>
}

/**
 * Import scope items from CSV data
 */
export async function importScopeItemsAction(
  budgetVersionId: string,
  items: CSVScopeItem[]
): Promise<ImportResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Verify budget version ownership
  const { data: budgetVersion, error: budgetError } = await supabase
    .from('budget_versions')
    .select(`
      id,
      job:jobs!inner (
        id,
        user_id
      )
    `)
    .eq('id', budgetVersionId)
    .single()

  if (budgetError || !budgetVersion) {
    throw new Error('Budget version not found')
  }

  if ((budgetVersion.job as any).user_id !== user.id) {
    throw new Error('Not authorized')
  }

  // Get all categories to map names to IDs
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')

  const categoryMap = new Map(
    categories?.map(c => [c.name.toLowerCase(), c.id]) || []
  )

  const errors: Array<{ row: number; message: string }> = []
  const validItems: any[] = []

  // Validate and prepare items
  items.forEach((item, index) => {
    const rowNumber = index + 2 // +2 because row 1 is headers, and index starts at 0

    // Validate required fields
    if (!item.description || item.description.trim() === '') {
      errors.push({ row: rowNumber, message: 'Description is required' })
      return
    }

    // Map category name to ID
    let categoryId = null
    if (item.category && item.category.trim() !== '') {
      categoryId = categoryMap.get(item.category.toLowerCase())
      if (!categoryId) {
        errors.push({
          row: rowNumber,
          message: `Unknown category "${item.category}". Using "Other".`
        })
        categoryId = categoryMap.get('other') || null
      }
    }

    // Validate numeric fields
    const materialCost = parseFloat(String(item.estimated_material_cost)) || 0
    const laborHours = parseFloat(String(item.estimated_labor_hours)) || 0
    const laborRate = parseFloat(String(item.estimated_labor_rate)) || 50

    if (materialCost < 0) {
      errors.push({ row: rowNumber, message: 'Material cost cannot be negative' })
      return
    }

    if (laborHours < 0) {
      errors.push({ row: rowNumber, message: 'Labor hours cannot be negative' })
      return
    }

    if (laborRate < 0) {
      errors.push({ row: rowNumber, message: 'Labor rate cannot be negative' })
      return
    }

    validItems.push({
      budget_version_id: budgetVersionId,
      category_id: categoryId,
      description: item.description.trim(),
      estimated_material_cost: materialCost,
      estimated_labor_hours: laborHours,
      estimated_labor_rate: laborRate,
      notes: item.notes?.trim() || null,
      actual_material_cost: 0,
      actual_labor_hours: 0,
      is_completed: false
    })
  })

  // Insert valid items
  let imported = 0
  if (validItems.length > 0) {
    const { data, error } = await supabase
      .from('scope_items')
      .insert(validItems)
      .select()

    if (error) {
      console.error('Error inserting scope items:', error)
      throw new Error('Failed to import items')
    }

    imported = data?.length || 0
  }

  revalidatePath(`/jobs/${(budgetVersion.job as any).id}`)

  return {
    success: true,
    imported,
    errors
  }
}

/**
 * Export scope items to CSV format
 */
export async function exportScopeItemsAction(budgetVersionId: string): Promise<string> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Fetch scope items with categories
  const { data: scopeItems, error } = await supabase
    .from('scope_items')
    .select(`
      description,
      estimated_material_cost,
      estimated_labor_hours,
      estimated_labor_rate,
      actual_material_cost,
      actual_labor_hours,
      notes,
      is_completed,
      category:categories (
        name
      ),
      budget_version:budget_versions!inner (
        job:jobs!inner (
          user_id
        )
      )
    `)
    .eq('budget_version_id', budgetVersionId)
    .order('created_at', { ascending: true })

  if (error || !scopeItems) {
    throw new Error('Failed to fetch scope items')
  }

  // Build CSV
  const headers = [
    'Description',
    'Category',
    'Estimated Material',
    'Estimated Labor Hours',
    'Estimated Labor Rate',
    'Estimated Total',
    'Actual Material',
    'Actual Labor Hours',
    'Actual Total',
    'Variance',
    'Variance %',
    'Completed',
    'Notes'
  ]

  const rows = scopeItems.map(item => {
    const estTotal = item.estimated_material_cost + (item.estimated_labor_hours * item.estimated_labor_rate)
    const actTotal = item.actual_material_cost + (item.actual_labor_hours * item.estimated_labor_rate)
    const variance = actTotal - estTotal
    const variancePercent = estTotal > 0 ? (variance / estTotal) * 100 : 0

    return [
      `"${(item.description || '').replace(/"/g, '""')}"`,
      `"${(item.category as any)?.name || ''}"`,
      item.estimated_material_cost.toFixed(2),
      item.estimated_labor_hours.toFixed(2),
      item.estimated_labor_rate.toFixed(2),
      estTotal.toFixed(2),
      item.actual_material_cost.toFixed(2),
      item.actual_labor_hours.toFixed(2),
      actTotal.toFixed(2),
      variance.toFixed(2),
      variancePercent.toFixed(2),
      item.is_completed ? 'Yes' : 'No',
      `"${(item.notes || '').replace(/"/g, '""')}"`
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}
