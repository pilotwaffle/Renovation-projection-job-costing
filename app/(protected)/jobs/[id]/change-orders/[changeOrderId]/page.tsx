import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import type { ChangeOrderItem } from '@/lib/types'
import { ApproveRejectButtons } from './ApproveRejectButtons'

export default async function ChangeOrderDetailPage({
  params
}: {
  params: Promise<{ id: string; changeOrderId: string }>
}) {
  const { id: jobId, changeOrderId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: changeOrder } = await supabase
    .from('change_orders')
    .select('*')
    .eq('id', changeOrderId)
    .single()

  if (!changeOrder) {
    notFound()
  }

  const { data: job } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  const { data: items } = await supabase
    .from('change_order_items')
    .select('*')
    .eq('change_order_id', changeOrderId)
    .order('created_at', { ascending: true })

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

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'add':
        return 'text-green-600'
      case 'remove':
        return 'text-red-600'
      case 'modify':
        return 'text-blue-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userEmail={user.email} showLogout={true} />

      <div className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Link
              href={`/jobs/${jobId}/change-orders`}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              ← Back to Change Orders
            </Link>
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{changeOrder.title}</h1>
                <p className="mt-1 text-sm text-gray-600">{job?.name}</p>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(changeOrder.status)}`}>
                {changeOrder.status}
              </span>
            </div>

            {changeOrder.description && (
              <p className="mt-4 text-gray-700">{changeOrder.description}</p>
            )}

            <div className="mt-4 flex items-center gap-6 text-sm text-gray-600">
              <span>Created: {new Date(changeOrder.created_at).toLocaleString()}</span>
              {changeOrder.approved_at && (
                <span>Approved: {new Date(changeOrder.approved_at).toLocaleString()}</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {changeOrder.status === 'pending' && (
            <ApproveRejectButtons changeOrderId={changeOrderId} jobId={jobId} />
          )}

          {/* Total Impact Card */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Budget Impact</h3>
            <p className={`text-3xl font-bold ${changeOrder.impact_amount >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {changeOrder.impact_amount >= 0 ? '+' : ''}${changeOrder.impact_amount.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {changeOrder.impact_amount >= 0 ? 'Increase to budget' : 'Decrease to budget'}
            </p>
          </div>

          {/* Change Order Items */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Change Items</h2>
            </div>
            {items && items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cost Impact
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item: ChangeOrderItem) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium capitalize ${getChangeTypeColor(item.change_type)}`}>
                            {item.change_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {item.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <span className={item.cost_impact >= 0 ? 'text-red-600' : 'text-green-600'}>
                            {item.cost_impact >= 0 ? '+' : ''}${item.cost_impact.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-12 text-center text-gray-500">
                No items added yet. Items can be added to track specific changes and their cost impacts.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
