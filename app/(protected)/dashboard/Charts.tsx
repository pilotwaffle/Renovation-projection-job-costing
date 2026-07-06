'use client'

import { useRouter } from 'next/navigation'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface VarianceChartProps {
  data: Array<{
    id?: string
    name: string
    variance: number
  }>
}

interface CategoryChartProps {
  data: Array<{
    name: string
    value: number
    color: string
  }>
}

export function VarianceChart({ data }: VarianceChartProps) {
  const router = useRouter()

  if (data.length === 0) {
    return <p className="text-gray-500 text-center py-12">No variance data available yet</p>
  }

  const handleBarClick = (barData: unknown) => {
    const payload = (barData as { payload?: { id?: string } })?.payload
    const id = payload?.id ?? (barData as { id?: string })?.id
    if (id) {
      router.push(`/jobs/${id}`)
    }
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
          <YAxis label={{ value: 'Variance %', angle: -90, position: 'insideLeft' }} />
          <Tooltip formatter={(value) => `${value}%`} />
          <Bar dataKey="variance" onClick={handleBarClick} cursor="pointer">
            {data.map((entry, index) => (
              <Cell
                key={`bar-${index}`}
                fill={entry.variance > 0 ? '#ef4444' : '#10b981'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 text-center -mt-2">Click a bar to open that job</p>
    </>
  )
}

export function CategoryChart({ data }: CategoryChartProps) {
  if (data.length === 0) {
    return <p className="text-gray-500 text-center py-12">No category data available yet</p>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(props) => {
            const percent = (props as { percent?: number }).percent || 0
            const name = (props as { name?: string }).name || ''
            return `${name} ${(percent * 100).toFixed(0)}%`
          }}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number | string) => `$${typeof value === 'number' ? value.toFixed(2) : value}`} />
      </PieChart>
    </ResponsiveContainer>
  )
}
