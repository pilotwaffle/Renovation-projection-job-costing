import { getTemplateByIdAction } from '../actions'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let template
  try {
    template = await getTemplateByIdAction(id)
  } catch {
    notFound()
  }

  const items = template.template_items || []
  const estimatedTotal = template.estimated_total || 0

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Link href="/templates" className="hover:text-blue-600">
            Templates
          </Link>
          <span>/</span>
          <span>{template.name}</span>
        </div>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{template.name}</h1>
            {template.description && (
              <p className="text-gray-600 mt-2">{template.description}</p>
            )}
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Used {template.use_count} times</div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600">Total Items</div>
            <div className="text-2xl font-bold">{items.length}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Estimated Total</div>
            <div className="text-2xl font-bold">${estimatedTotal.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Avg. per Item</div>
            <div className="text-2xl font-bold">
              ${items.length > 0 ? (estimatedTotal / items.length).toFixed(2) : '0.00'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Categories</div>
            <div className="text-2xl font-bold">
              {new Set(items.map(item => item.category_id).filter(Boolean)).size}
            </div>
          </div>
        </div>
      </div>

      {/* Template Items Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Template Items</h2>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            This template has no items
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Material
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Labor Hrs
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Est. Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => {
                  const laborCost = (item.estimated_labor_hours || 0) * (item.estimated_labor_rate || 0)
                  const itemTotal = (item.estimated_material_cost || 0) + laborCost

                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.category ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {item.category.name}
                          </span>
                        ) : (
                          <span className="text-gray-600 text-sm">Uncategorized</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{item.description}</div>
                        {item.notes && (
                          <div className="text-sm text-gray-500 mt-1">{item.notes}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        ${(item.estimated_material_cost || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {(item.estimated_labor_hours || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        ${(item.estimated_labor_rate || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        ${itemTotal.toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    Total Estimated:
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                    ${estimatedTotal.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Back Button */}
      <div className="mt-8">
        <Link
          href="/templates"
          className="inline-flex items-center text-blue-600 hover:text-blue-700"
        >
          ← Back to Templates
        </Link>
      </div>
    </div>
  )
}
