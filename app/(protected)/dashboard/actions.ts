'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

/**
 * Get dashboard overview metrics
 */
export async function getDashboardMetrics() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Fetch all jobs with their budget data
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select(`
      id,
      name,
      status,
      client_name,
      created_at,
      budget_versions (
        id,
        scope_items (
          estimated_material_cost,
          estimated_labor_hours,
          estimated_labor_rate,
          actual_material_cost,
          actual_labor_hours
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (jobsError) {
    console.error('Error fetching jobs:', jobsError)
    return {
      totalJobs: 0,
      activeJobs: 0,
      totalBudgetValue: 0,
      totalActualSpending: 0,
      averageVariance: 0,
      jobs: []
    }
  }

  // Calculate metrics
  const totalJobs = jobs?.length || 0
  const activeJobs = jobs?.filter(j => j.status === 'active').length || 0

  let totalBudgetValue = 0
  let totalActualSpending = 0
  let totalVariance = 0
  let jobsWithBudgets = 0

  const jobMetrics = jobs?.map(job => {
    const latestBudget = job.budget_versions?.[0]
    const scopeItems = latestBudget?.scope_items || []

    const estimated = scopeItems.reduce((sum, item) => {
      return sum + (item.estimated_material_cost || 0) +
        ((item.estimated_labor_hours || 0) * (item.estimated_labor_rate || 0))
    }, 0)

    const actual = scopeItems.reduce((sum, item) => {
      return sum + (item.actual_material_cost || 0) +
        ((item.actual_labor_hours || 0) * (item.estimated_labor_rate || 0))
    }, 0)

    const variance = actual - estimated
    const variancePercentage = estimated > 0 ? (variance / estimated) * 100 : 0

    totalBudgetValue += estimated
    totalActualSpending += actual

    if (estimated > 0) {
      totalVariance += variancePercentage
      jobsWithBudgets++
    }

    return {
      id: job.id,
      name: job.name,
      client_name: job.client_name,
      status: job.status,
      estimated,
      actual,
      variance,
      variancePercentage,
      itemCount: scopeItems.length
    }
  }) || []

  const averageVariance = jobsWithBudgets > 0 ? totalVariance / jobsWithBudgets : 0

  return {
    totalJobs,
    activeJobs,
    totalBudgetValue,
    totalActualSpending,
    averageVariance,
    jobs: jobMetrics
  }
}

/**
 * Get category breakdown across all jobs
 */
export async function getCategoryBreakdown() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Fetch all scope items with categories
  const { data: scopeItems, error } = await supabase
    .from('scope_items')
    .select(`
      estimated_material_cost,
      estimated_labor_hours,
      estimated_labor_rate,
      category:categories (
        id,
        name,
        color
      ),
      budget_version:budget_versions!inner (
        job:jobs!inner (
          user_id
        )
      )
    `)

  if (error || !scopeItems) {
    console.error('Error fetching category breakdown:', error)
    return []
  }

  // Group by category
  const categoryMap = new Map<string, {
    name: string
    color: string
    total: number
  }>()

  scopeItems.forEach(item => {
    const category = Array.isArray(item.category) ? item.category[0] : item.category
    const categoryName = category?.name || 'Uncategorized'
    const categoryColor = category?.color || '#64748b'
    const itemTotal = (item.estimated_material_cost || 0) +
      ((item.estimated_labor_hours || 0) * (item.estimated_labor_rate || 0))

    if (categoryMap.has(categoryName)) {
      const existing = categoryMap.get(categoryName)!
      existing.total += itemTotal
    } else {
      categoryMap.set(categoryName, {
        name: categoryName,
        color: categoryColor,
        total: itemTotal
      })
    }
  })

  // Convert to array and sort by total
  return Array.from(categoryMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10) // Top 10 categories
}

/**
 * Get recent activity (placeholder for now - will be enhanced with activity log later)
 */
export async function getRecentActivity() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Not authenticated')
  }

  // For now, return recently updated jobs
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, name, updated_at, created_at')
    .order('updated_at', { ascending: false })
    .limit(5)

  if (error || !jobs) {
    return []
  }

  return jobs.map(job => ({
    id: job.id,
    message: `Job "${job.name}" was updated`,
    timestamp: job.updated_at,
    type: 'job_update' as const
  }))
}
