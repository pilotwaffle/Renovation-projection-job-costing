import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout, getDashboardMetrics, getCategoryBreakdown, getRecentActivity } from './actions'
import Link from 'next/link'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatDistanceToNow } from 'date-fns'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch dashboard data
  const metrics = await getDashboardMetrics()
  const categoryBreakdown = await getCategoryBreakdown()
  const recentActivity = await getRecentActivity()

  // Prepare data for variance bar chart (top 5 jobs by variance)
  const varianceChartData = metrics.jobs
    .filter(j => j.estimated > 0)
    .sort((a, b) => Math.abs(b.variancePercentage) - Math.abs(a.variancePercentage))
    .slice(0, 5)
    .map(j => ({
      name: j.name.length > 20 ? j.name.substring(0, 20) + '...' : j.name,
      variance: parseFloat(j.variancePercentage.toFixed(2))
    }))

  // Prepare data for category pie chart
  const pieChartData = categoryBreakdown.map(c => ({
    name: c.name,
    value: parseFloat(c.total.toFixed(2)),
    color: c.color
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <h1 className="text-xl font-bold text-gray-900">Job Costing</h1>
              </div>
              <div className="ml-10 flex items-center space-x-4">
                <a href="/dashboard" className="text-blue-600 hover:text-blue-700 px-3 py-2 text-sm font-medium">
                  Dashboard
                </a>
                <a href="/jobs" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                  Jobs
                </a>
                <a href="/templates" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                  Templates
                </a>
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

            {/* Overview Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                <dt className="truncate text-sm font-medium text-gray-500">Total Jobs</dt>
                <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                  {metrics.totalJobs}
                </dd>
              </div>

              <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                <dt className="truncate text-sm font-medium text-gray-500">Active Jobs</dt>
                <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                  {metrics.activeJobs}
                </dd>
              </div>

              <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                <dt className="truncate text-sm font-medium text-gray-500">Total Budget Value</dt>
                <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                  ${metrics.totalBudgetValue.toFixed(0)}
                </dd>
              </div>

              <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                <dt className="truncate text-sm font-medium text-gray-500">Avg Variance</dt>
                <dd className={`mt-1 text-3xl font-semibold tracking-tight ${
                  metrics.averageVariance > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {metrics.averageVariance > 0 ? '+' : ''}{metrics.averageVariance.toFixed(1)}%
                </dd>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

              {/* Variance Bar Chart */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Jobs by Variance</h2>
                {varianceChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={varianceChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis label={{ value: 'Variance %', angle: -90, position: 'insideLeft' }} />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Bar dataKey="variance" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-12">No variance data available yet</p>
                )}
              </div>

              {/* Category Pie Chart */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Budget by Category</h2>
                {pieChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-12">No category data available yet</p>
                )}
              </div>
            </div>

            {/* Recent Activity & Jobs Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Recent Activity */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
                {recentActivity.length > 0 ? (
                  <ul className="space-y-3">
                    {recentActivity.map((activity) => (
                      <li key={activity.id} className="text-sm">
                        <p className="text-gray-900">{activity.message}</p>
                        <p className="text-gray-500 text-xs mt-1">
                          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-sm">No recent activity</p>
                )}
              </div>

              {/* Jobs Summary Table */}
              <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">All Jobs</h2>
                  <Link
                    href="/jobs/new"
                    className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                  >
                    New Job
                  </Link>
                </div>

                {metrics.jobs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead>
                        <tr>
                          <th className="py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Job</th>
                          <th className="py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Client</th>
                          <th className="py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Estimated</th>
                          <th className="py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Actual</th>
                          <th className="py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Variance</th>
                          <th className="py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {metrics.jobs.map((job) => (
                          <tr key={job.id} className="hover:bg-gray-50">
                            <td className="py-3 text-sm">
                              <Link href={`/jobs/${job.id}`} className="text-blue-600 hover:text-blue-700">
                                {job.name}
                              </Link>
                            </td>
                            <td className="py-3 text-sm text-gray-500">{job.client_name || '-'}</td>
                            <td className="py-3 text-sm text-gray-900 text-right">${job.estimated.toFixed(2)}</td>
                            <td className="py-3 text-sm text-gray-900 text-right">${job.actual.toFixed(2)}</td>
                            <td className={`py-3 text-sm text-right ${
                              job.variance > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {job.variance > 0 ? '+' : ''}${job.variance.toFixed(2)}
                              <span className="text-xs ml-1">
                                ({job.variancePercentage > 0 ? '+' : ''}{job.variancePercentage.toFixed(1)}%)
                              </span>
                            </td>
                            <td className="py-3 text-sm">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                job.status === 'active' ? 'bg-green-100 text-green-800' :
                                job.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {job.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">No jobs yet. Create your first job to get started.</p>
                    <Link
                      href="/jobs/new"
                      className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                    >
                      Create First Job
                    </Link>
                  </div>
                )}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
