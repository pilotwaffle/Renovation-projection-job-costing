import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Job, BudgetVersion, ScopeItemWithCategory } from '@/lib/types'
import { Camera, Calendar } from 'lucide-react'

// Fetch photo count for each scope item
async function getPhotoCounts(scopeItemIds: string[]) {
  const supabase = await createClient()

  if (scopeItemIds.length === 0) return {}

  const { data } = await supabase
    .from('scope_item_photos')
    .select('scope_item_id')
    .in('scope_item_id', scopeItemIds)

  const counts: Record<string, number> = {}
  data?.forEach(photo => {
    counts[photo.scope_item_id] = (counts[photo.scope_item_id] || 0) + 1
  })

  return counts
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch job
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .single()

  if (jobError || !job) {
    notFound()
  }

  // Fetch latest budget version
  const { data: budgetVersions } = await supabase
    .from('budget_versions')
    .select('*')
    .eq('job_id', id)
    .order('version', { ascending: false })
    .limit(1)

  const budgetVersion = budgetVersions?.[0]

  // Fetch scope items if budget exists
  let scopeItems: ScopeItemWithCategory[] = []
  if (budgetVersion) {
    const { data } = await supabase
      .from('scope_items')
      .select(`
        *,
        category:categories(*)
      `)
      .eq('budget_version_id', budgetVersion.id)
      .order('created_at', { ascending: true })

    scopeItems = data || []
  }

  // Get photo counts for scope items
  const scopeItemIds = scopeItems.map(item => item.id)
  const photoCounts = await getPhotoCounts(scopeItemIds)

  // Calculate totals
  const totalEstimated = scopeItems.reduce((sum, item) =>
    sum + (item.estimated_material_cost + (item.estimated_labor_hours * item.estimated_labor_rate)), 0
  )
  const totalActual = scopeItems.reduce((sum, item) =>
    sum + (item.actual_material_cost + (item.actual_labor_hours * item.estimated_labor_rate)), 0
  )
  const variance = totalActual - totalEstimated

  // Calculate total photos
  const totalPhotos = Object.values(photoCounts).reduce((sum, count) => sum + count, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-10">
        <header>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Link href="/jobs" className="text-sm text-blue-600 hover:text-blue-500 mb-4 inline-block">
              ← Back to Jobs
            </Link>
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">{job.name}</h1>
            {job.client_name && <p className="mt-1 text-sm text-gray-600">Client: {job.client_name}</p>}
            {job.address && <p className="mt-1 text-sm text-gray-600">{job.address}</p>}
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Budget Summary */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-8">
            <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
              <dt className="truncate text-sm font-medium text-gray-500">Estimated Total</dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                ${totalEstimated.toFixed(2)}
              </dd>
            </div>
            <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
              <dt className="truncate text-sm font-medium text-gray-500">Actual Total</dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                ${totalActual.toFixed(2)}
              </dd>
            </div>
            <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
              <dt className="truncate text-sm font-medium text-gray-500">Variance</dt>
              <dd className={`mt-1 text-3xl font-semibold tracking-tight ${variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {variance > 0 ? '+' : ''}${variance.toFixed(2)}
              </dd>
            </div>
            <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
              <dt className="truncate text-sm font-medium text-gray-500">Total Photos</dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                {totalPhotos}
              </dd>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 mb-8">
            <Link
              href={`/jobs/${id}/schedule`}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Project Schedule
            </Link>
            <Link
              href={`/jobs/${id}/items/new`}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Add Budget Item
            </Link>
          </div>

          {/* Scope Items */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Scope Items</h2>
                <Link
                  href={`/jobs/${id}/items/new`}
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                >
                  Add Item
                </Link>
              </div>

              {scopeItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead>
                      <tr>
                        <th className="py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Description</th>
                        <th className="py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Category</th>
                        <th className="py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Photos</th>
                        <th className="py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Estimated</th>
                        <th className="py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Actual</th>
                        <th className="py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Variance</th>
                        <th className="py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {scopeItems.map((item) => {
                        const estimated = item.estimated_material_cost + (item.estimated_labor_hours * item.estimated_labor_rate)
                        const actual = item.actual_material_cost + (item.actual_labor_hours * item.estimated_labor_rate)
                        const itemVariance = actual - estimated
                        const photoCount = photoCounts[item.id] || 0

                        return (
                          <tr key={item.id}>
                            <td className="py-4">
                              <div>
                                <Link
                                  href={`/jobs/${id}/items/${item.id}`}
                                  className="text-sm font-medium text-gray-900 hover:text-blue-600"
                                >
                                  {item.description}
                                </Link>
                                {item.is_completed && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                    Completed
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 text-sm text-gray-500">
                              {item.category?.name || '-'}
                            </td>
                            <td className="py-4 text-sm text-gray-500">
                              {photoCount > 0 ? (
                                <Link
                                  href={`/jobs/${id}/items/${item.id}`}
                                  className="flex items-center text-blue-600 hover:text-blue-500"
                                >
                                  <Camera className="w-4 h-4 mr-1" />
                                  {photoCount}
                                </Link>
                              ) : (
                                <span className="text-gray-400">0</span>
                              )}
                            </td>
                            <td className="py-4 text-sm text-gray-900 text-right">${estimated.toFixed(2)}</td>
                            <td className="py-4 text-sm text-gray-900 text-right">${actual.toFixed(2)}</td>
                            <td className={`py-4 text-sm text-right ${itemVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {itemVariance > 0 ? '+' : ''}${itemVariance.toFixed(2)}
                            </td>
                            <td className="py-4 text-sm text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <Link
                                  href={`/jobs/${id}/items/${item.id}`}
                                  className="text-blue-600 hover:text-blue-500"
                                  title="View photos and details"
                                >
                                  View
                                </Link>
                                <span className="text-gray-300">•</span>
                                <Link
                                  href={`/jobs/${id}/items/${item.id}/edit`}
                                  className="text-blue-600 hover:text-blue-500"
                                  title="Edit costs"
                                >
                                  Edit
                                </Link>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">
                  No scope items yet. Add your first item to get started.
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}