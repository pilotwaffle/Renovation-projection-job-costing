import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Job } from '@/lib/types'
import DashboardLayout from '@/components/DashboardLayout'

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
    <DashboardLayout user={{ email: user.email }}>
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
              <div className="overflow-hidden bg-white shadow sm:rounded-md">
                <ul role="list" className="divide-y divide-gray-200">
                  {jobs.map((job: Job) => (
                    <li key={job.id}>
                      <Link href={`/jobs/${job.id}`} className="block hover:bg-gray-50">
                        <div className="px-4 py-4 sm:px-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="truncate text-sm font-medium text-blue-600">{job.name}</p>
                              {job.client_name && (
                                <p className="mt-1 text-sm text-gray-500">Client: {job.client_name}</p>
                              )}
                              {job.address && (
                                <p className="mt-1 text-sm text-gray-500">{job.address}</p>
                              )}
                            </div>
                            <div className="ml-4 flex-shrink-0">
                              <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                job.status === 'active' ? 'bg-green-100 text-green-800' :
                                job.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {job.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
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
    </DashboardLayout>
  )
}
