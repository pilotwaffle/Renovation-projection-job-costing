import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { JobsTable } from './JobsTable'

export default async function JobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userEmail={user.email} showLogout={true} />

      <div className="py-10">
        <header>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">Jobs</h1>
            <Link
              href="/jobs/new"
              className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
            >
              Create Job
            </Link>
          </div>
        </header>
        <main>
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {jobs && jobs.length > 0 ? (
              <JobsTable initialJobs={jobs} />
            ) : (
              <div className="text-center">
                <p className="mt-4 text-sm text-gray-600">No jobs yet. Create your first job to get started.</p>
                <div className="mt-6">
                  <Link
                    href="/jobs/new"
                    className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                  >
                    Create First Job
                  </Link>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}