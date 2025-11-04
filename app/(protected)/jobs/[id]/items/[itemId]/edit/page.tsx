import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateScopeItem } from './actions'

export default async function EditScopeItemPage({
  params
}: {
  params: Promise<{ id: string; itemId: string }>
}) {
  const { id: jobId, itemId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: item } = await supabase
    .from('scope_items')
    .select('*, budget_version:budget_versions(*, job:jobs(*))')
    .eq('id', itemId)
    .single()

  if (!item) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Budget Item</h1>
        <p className="text-sm text-gray-700 mb-8">{item.description}</p>

        <form className="space-y-6 bg-white p-6 shadow sm:rounded-lg">
          <input type="hidden" name="item_id" value={itemId} />
          <input type="hidden" name="job_id" value={jobId} />

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-900">
              Description *
            </label>
            <input
              type="text"
              name="description"
              id="description"
              required
              defaultValue={item.description}
              className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
            />
          </div>

          {/* Estimated Costs (Editable) */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Estimated Budget</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="estimated_material_cost" className="block text-sm font-medium text-gray-900">
                  Material Cost
                </label>
                <input
                  type="number"
                  name="estimated_material_cost"
                  id="estimated_material_cost"
                  step="0.01"
                  min="0"
                  defaultValue={item.estimated_material_cost}
                  className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                />
              </div>
              <div>
                <label htmlFor="estimated_labor_hours" className="block text-sm font-medium text-gray-900">
                  Labor Hours
                </label>
                <input
                  type="number"
                  name="estimated_labor_hours"
                  id="estimated_labor_hours"
                  step="0.25"
                  min="0"
                  defaultValue={item.estimated_labor_hours}
                  className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                />
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor="estimated_labor_rate" className="block text-sm font-medium text-gray-900">
                Labor Rate ($/hour)
              </label>
              <input
                type="number"
                name="estimated_labor_rate"
                id="estimated_labor_rate"
                step="0.01"
                min="0"
                defaultValue={item.estimated_labor_rate}
                className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
              />
            </div>
          </div>

          {/* Actual Costs (Editable) */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Actual Costs</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="actual_material_cost" className="block text-sm font-medium text-gray-900">
                  Actual Material Cost
                </label>
                <input
                  type="number"
                  name="actual_material_cost"
                  id="actual_material_cost"
                  step="0.01"
                  min="0"
                  defaultValue={item.actual_material_cost}
                  className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                />
              </div>

              <div>
                <label htmlFor="actual_labor_hours" className="block text-sm font-medium text-gray-900">
                  Actual Labor Hours
                </label>
                <input
                  type="number"
                  name="actual_labor_hours"
                  id="actual_labor_hours"
                  step="0.25"
                  min="0"
                  defaultValue={item.actual_labor_hours}
                  className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-900">
              Notes
            </label>
            <textarea
              name="notes"
              id="notes"
              rows={3}
              defaultValue={item.notes || ''}
              className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
              placeholder="Any notes about the actual costs..."
            />
          </div>

          <div className="flex items-center gap-4">
            <input
              type="checkbox"
              name="is_completed"
              id="is_completed"
              defaultChecked={item.is_completed}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_completed" className="text-sm font-medium text-gray-900">
              Mark as completed
            </label>
          </div>

          <div className="flex gap-4">
            <button
              formAction={updateScopeItem}
              type="submit"
              className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Update Item
            </button>
            <a
              href={`/jobs/${jobId}`}
              className="flex-1 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 text-center"
            >
              Cancel
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
