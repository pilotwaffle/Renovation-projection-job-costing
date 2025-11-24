'use client'

import { deleteJobAction } from './actions'
import { useState } from 'react'

export function DeleteJobButton({ jobId, jobName }: { jobId: string; jobName: string }) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${jobName}"? This action cannot be undone and will delete all associated budget data.`)) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteJobAction(jobId)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete job')
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        handleDelete()
      }}
      disabled={isDeleting}
      className="inline-flex items-center rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
      title="Delete job"
    >
      {isDeleting ? 'Deleting...' : 'Delete'}
    </button>
  )
}
