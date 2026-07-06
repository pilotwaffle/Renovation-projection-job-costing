import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDashboardMetrics, getCategoryBreakdown, getRecentActivity } from './actions'
import Link from 'next/link'
import { VarianceChart, CategoryChart } from './Charts'
import CountUp from './CountUp'
import { formatDistanceToNow } from 'date-fns'
import Navigation from '@/components/Navigation'
import { formatVarianceChartData, formatPieChartData } from './utils'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch dashboard data in parallel
    const [metrics, categoryBreakdown, recentActivity] = await Promise.all([
        getDashboardMetrics(),
        getCategoryBreakdown(),
        getRecentActivity()
    ])

    // Prepare data for charts using utility functions
    const varianceChartData = formatVarianceChartData(metrics.jobs)
    const pieChartData = formatPieChartData(categoryBreakdown)

    return (
        <div className="min-h-screen bg-gray-50">
            <Navigation userEmail={user.email} showLogout={true} />

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
                                    <CountUp value={metrics.totalJobs} />
                                </dd>
                            </div>

                            <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                                <dt className="truncate text-sm font-medium text-gray-500">Active Jobs</dt>
                                <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                                    <CountUp value={metrics.activeJobs} />
                                </dd>
                            </div>

                            <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                                <dt className="truncate text-sm font-medium text-gray-500">Total Budget Value</dt>
                                <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                                    <CountUp value={metrics.totalBudgetValue} prefix="$" />
                                </dd>
                            </div>

                            <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                                <dt className="truncate text-sm font-medium text-gray-500">Avg Variance</dt>
                                <dd className={`mt-1 text-3xl font-semibold tracking-tight ${metrics.averageVariance > 0 ? 'text-red-600' : 'text-green-600'
                                    }`}>
                                    {metrics.averageVariance > 0 ? '+' : ''}
                                    <CountUp value={metrics.averageVariance} decimals={1} suffix="%" />
                                </dd>
                            </div>
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

                            {/* Variance Bar Chart */}
                            <div className="bg-white rounded-lg shadow p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Jobs by Variance</h2>
                                <VarianceChart data={varianceChartData} />
                            </div>

                            {/* Category Pie Chart */}
                            <div className="bg-white rounded-lg shadow p-6">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4">Budget by Category</h2>
                                <CategoryChart data={pieChartData} />
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
                                                        <td className={`py-3 text-sm text-right ${job.variance > 0 ? 'text-red-600' : 'text-green-600'
                                                            }`}>
                                                            {job.variance > 0 ? '+' : ''}${job.variance.toFixed(2)}
                                                            <span className="text-xs ml-1">
                                                                ({job.variancePercentage > 0 ? '+' : ''}{job.variancePercentage.toFixed(1)}%)
                                                            </span>
                                                        </td>
                                                        <td className="py-3 text-sm">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${job.status === 'active' ? 'bg-green-100 text-green-800' :
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