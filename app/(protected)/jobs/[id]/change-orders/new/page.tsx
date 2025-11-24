import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { createChangeOrderAction } from '../actions'

export default async function NewChangeOrderPage({
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userEmail={user.email} showLogout={true} />

      <div className="py-10">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Link
              href={`/jobs/${jobId}/change-orders`}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              ← Back to Change Orders
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Change Order</h1>
          <p className="text-sm text-gray-600 mb-8">For job: {job.name}</p>

          <form action={createChangeOrderAction} className="space-y-6 bg-white p-6 shadow sm:rounded-lg">
            <input type="hidden" name="job_id" value={jobId} />

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-900">
                Title *
              </label>
              <input
                type="text"
                name="title"
                id="title"
                required
                className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="e.g., Add kitchen island"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-900">
                Description
              </label>
              <textarea
                name="description"
                id="description"
                rows={4}
                className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Describe the scope change..."
              />
            </div>

            <div className="bg-blue-50 rounded-md p-4">
              <p className="text-sm text-blue-800">
                After creating the change order, you can add specific items and their cost impacts.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Create Change Order
              </button>
              <Link
                href={`/jobs/${jobId}/change-orders`}
                className="flex-1 rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
