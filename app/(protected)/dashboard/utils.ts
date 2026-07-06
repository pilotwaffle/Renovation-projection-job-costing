export interface JobMetric {
    id: string
    name: string
    client_name: string | null
    status: string
    estimated: number
    actual: number
    variance: number
    variancePercentage: number
    itemCount: number
}

export interface DashboardMetrics {
    totalJobs: number
    activeJobs: number
    totalBudgetValue: number
    totalActualSpending: number
    averageVariance: number
    jobs: JobMetric[]
}

export interface CategoryBreakdownItem {
    name: string
    color: string
    total: number
}

export function formatVarianceChartData(jobs: JobMetric[]) {
    return jobs
        .filter(j => j.estimated > 0)
        .sort((a, b) => Math.abs(b.variancePercentage) - Math.abs(a.variancePercentage))
        .slice(0, 5)
        .map(j => ({
            id: j.id,
            name: j.name.length > 20 ? j.name.substring(0, 20) + '...' : j.name,
            variance: parseFloat(j.variancePercentage.toFixed(2))
        }))
}

export function formatPieChartData(categories: CategoryBreakdownItem[]) {
    return categories.map(c => ({
        name: c.name,
        value: parseFloat(c.total.toFixed(2)),
        color: c.color
    }))
}
