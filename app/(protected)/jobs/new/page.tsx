import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createJob } from './actions'

export default async function NewJobPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-10">
        <header>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">Create New Job</h1>
          </div>
        </header>
        <main>
          <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
            <form className="space-y-6 bg-white p-6 shadow sm:rounded-lg">
              <div>
                <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">
                  Job Name *
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    placeholder="Kitchen Renovation"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="client_name" className="block text-sm font-medium leading-6 text-gray-900">
                  Client Name
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    name="client_name"
                    id="client_name"
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    placeholder="John Smith"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium leading-6 text-gray-900">
                  Address
                </label>
                <div className="mt-2">
                  <textarea
                    id="address"
                    name="address"
                    rows={2}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                    placeholder="123 Main St, City, State 12345"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  formAction={createJob}
                  type="submit"
                  className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  Create Job
                </button>
                <a
                  href="/jobs"
                  className="flex-1 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 text-center"
                >
                  Cancel
                </a>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}
