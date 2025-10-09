import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Job, BudgetVersion, ScopeItemWithCategory } from '@/lib/types'

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

  // Calculate totals
  const totalEstimated = scopeItems.reduce((sum, item) =>
    sum + (item.estimated_material_cost + (item.estimated_labor_hours * item.estimated_labor_rate)), 0
  )
  const totalActual = scopeItems.reduce((sum, item) =>
    sum + (item.actual_material_cost + (item.actual_labor_hours * item.estimated_labor_rate)), 0
  )
  const variance = totalActual - totalEstimated

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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
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

                        return (
                          <tr key={item.id}>
                            <td className="py-4 text-sm text-gray-900">{item.description}</td>
                            <td className="py-4 text-sm text-gray-500">
                              {item.category?.name || '-'}
                            </td>
                            <td className="py-4 text-sm text-gray-900 text-right">${estimated.toFixed(2)}</td>
                            <td className="py-4 text-sm text-gray-900 text-right">${actual.toFixed(2)}</td>
                            <td className={`py-4 text-sm text-right ${itemVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {itemVariance > 0 ? '+' : ''}${itemVariance.toFixed(2)}
                            </td>
                            <td className="py-4 text-sm text-right">
                              <Link
                                href={`/jobs/${id}/items/${item.id}/edit`}
                                className="text-blue-600 hover:text-blue-500"
                              >
                                Edit
                              </Link>
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
