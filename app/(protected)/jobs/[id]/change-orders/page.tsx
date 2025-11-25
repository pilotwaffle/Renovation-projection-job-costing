import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { getChangeOrdersAction } from './actions'

export default async function ChangeOrdersListPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id: jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: job } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (!job) {
    notFound()
  }

  const changeOrders = await getChangeOrdersAction(jobId)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'implemented':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userEmail={user.email} showLogout={true} />

      <div className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Link
              href={`/jobs/${jobId}`}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              ← Back to Job
            </Link>
          </div>

          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{job.name}</h1>
              <p className="mt-1 text-sm text-gray-600">Change Orders</p>
            </div>
            <Link
              href={`/jobs/${jobId}/change-orders/new`}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Create Change Order
            </Link>
          </div>

          {changeOrders.length > 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul role="list" className="divide-y divide-gray-200">
                {changeOrders.map((co) => (
                  <li key={co.id}>
                    <Link
                      href={`/jobs/${jobId}/change-orders/${co.id}`}
                      className="block hover:bg-gray-50 px-4 py-4 sm:px-6"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-blue-600 truncate">
                            {co.title}
                          </p>
                          {co.description && (
                            <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                              {co.description}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                            <span>
                              Created: {new Date(co.created_at).toLocaleDateString()}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(co.status)}`}>
                              {co.status}
                            </span>
                          </div>
                        </div>
                        <div className="ml-5 flex-shrink-0 text-right">
                          <p className={`text-lg font-semibold ${co.impact_amount >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {co.impact_amount >= 0 ? '+' : ''}${co.impact_amount.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">Impact</p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-center bg-white rounded-lg shadow p-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Change Orders</h3>
              <p className="text-sm text-gray-600 mb-6">
                Track scope changes and manage approvals with change orders.
              </p>
              <Link
                href={`/jobs/${jobId}/change-orders/new`}
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Create First Change Order
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
