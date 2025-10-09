import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from './actions'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <h1 className="text-xl font-bold text-gray-900">Job Costing</h1>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-4">{user.email}</span>
              <form>
                <button
                  formAction={logout}
                  className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-10">
        <header>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">Dashboard</h1>
          </div>
        </header>
        <main>
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="text-lg font-medium text-gray-900">Welcome to Job Costing</h2>
              <p className="mt-2 text-sm text-gray-600">
                Your renovation budget tracking application is ready. Start by creating your first job.
              </p>
              <div className="mt-6">
                <a
                  href="/jobs/new"
                  className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                >
                  Create First Job
                </a>
              </div>
            </div>

            {/* Stats placeholder */}
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                <dt className="truncate text-sm font-medium text-gray-500">Total Jobs</dt>
                <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">0</dd>
              </div>
              <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                <dt className="truncate text-sm font-medium text-gray-500">Active Projects</dt>
                <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">0</dd>
              </div>
              <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                <dt className="truncate text-sm font-medium text-gray-500">Avg Variance</dt>
                <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">0%</dd>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
