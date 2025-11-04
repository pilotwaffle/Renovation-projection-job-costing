import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createScopeItem } from './actions'

export default async function NewScopeItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: job } = await supabase
    .from('jobs')
    .select('*, budget_versions(*)')
    .eq('id', jobId)
    .single()

  if (!job) {
    notFound()
  }

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order')

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Add Scope Item</h1>

        <form className="space-y-6 bg-white p-6 shadow sm:rounded-lg">
          <input type="hidden" name="job_id" value={jobId} />

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-900">
              Description *
            </label>
            <input
              type="text"
              name="description"
              id="description"
              required
              className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
              placeholder="Install cabinets"
            />
          </div>

          <div>
            <label htmlFor="category_id" className="block text-sm font-medium text-gray-900">
              Category
            </label>
            <select
              name="category_id"
              id="category_id"
              className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
            >
              <option value="">Select category</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="estimated_material_cost" className="block text-sm font-medium text-gray-900">
                Estimated Material Cost
              </label>
              <input
                type="number"
                name="estimated_material_cost"
                id="estimated_material_cost"
                step="0.01"
                min="0"
                defaultValue="0"
                className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
              />
            </div>

            <div>
              <label htmlFor="estimated_labor_hours" className="block text-sm font-medium text-gray-900">
                Estimated Labor Hours
              </label>
              <input
                type="number"
                name="estimated_labor_hours"
                id="estimated_labor_hours"
                step="0.25"
                min="0"
                defaultValue="0"
                className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
              />
            </div>
          </div>

          <div>
            <label htmlFor="estimated_labor_rate" className="block text-sm font-medium text-gray-900">
              Labor Rate ($/hour)
            </label>
            <input
              type="number"
              name="estimated_labor_rate"
              id="estimated_labor_rate"
              step="0.01"
              min="0"
              defaultValue="50"
              className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
            />
          </div>

          <div className="flex gap-4">
            <button
              formAction={createScopeItem}
              type="submit"
              className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Add Item
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
