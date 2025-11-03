'use client'

import { useState } from 'react'
import { exportScopeItemsAction } from './csv/actions'

export default function CSVExportButton({
  budgetVersionId,
  jobName
}: {
  budgetVersionId: string
  jobName: string
}) {
  const [isLoading, setIsLoading] = useState(false)

  const handleExport = async () => {
    setIsLoading(true)

    try {
      const csvContent = await exportScopeItemsAction(budgetVersionId)

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      // Generate filename with job name and date
      const date = new Date().toISOString().split('T')[0]
      const filename = `${jobName.replace(/[^a-z0-9]/gi, '_')}_budget_${date}.csv`
      link.download = filename

      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      alert('Failed to export CSV. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={isLoading}
      className="rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 disabled:bg-gray-400"
    >
      {isLoading ? 'Exporting...' : 'Export CSV'}
    </button>
  )
}
