import { getTemplatesAction, deleteTemplateAction } from './actions'
import Link from 'next/link'
import type { BudgetTemplateWithItems } from '@/lib/types'

export default async function TemplatesPage() {
  const templates = await getTemplatesAction()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Budget Templates</h1>
        <p className="text-gray-600 mt-2">
          Reusable templates for common renovation projects. Save time by starting with a pre-configured budget.
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No templates yet</h3>
          <p className="text-gray-600 mb-4">
            Create your first template by saving an existing budget as a template.
          </p>
          <p className="text-sm text-gray-500">
            Go to any job&apos;s budget page and click &quot;Save as Template&quot;
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </div>
  )
}

function TemplateCard({ template }: { template: BudgetTemplateWithItems }) {
  const itemCount = template.template_items?.length || 0
  const estimatedTotal = template.estimated_total || 0

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
          {template.description && (
            <p className="text-sm text-gray-600 mt-1">{template.description}</p>
          )}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Items:</span>
          <span className="font-medium">{itemCount}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Est. Total:</span>
          <span className="font-medium">${estimatedTotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Used:</span>
          <span className="font-medium">{template.use_count} times</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/templates/${template.id}`}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-center text-sm"
        >
          View Details
        </Link>
        <form action={async () => {
          'use server'
          await deleteTemplateAction(template.id)
        }}>
          <button
            type="submit"
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm"
            onClick={(e) => {
              if (!confirm('Are you sure you want to delete this template? This cannot be undone.')) {
                e.preventDefault()
              }
            }}
          >
            Delete
          </button>
        </form>
      </div>
    </div>
  )
}
