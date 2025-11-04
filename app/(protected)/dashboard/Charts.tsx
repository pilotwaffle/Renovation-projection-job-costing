'use client'

import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface VarianceChartProps {
  data: Array<{
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
  if (data.length === 0) {
    return <p className="text-gray-500 text-center py-12">No variance data available yet</p>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
        <YAxis label={{ value: 'Variance %', angle: -90, position: 'insideLeft' }} />
        <Tooltip formatter={(value) => `${value}%`} />
        <Bar dataKey="variance" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
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
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
      </PieChart>
    </ResponsiveContainer>
  )
}
