'use client'

import { deleteScopeItemAction } from '../actions'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DeleteScopeItemButton({
  itemId,
  jobId,
  description
}: {
  itemId: string
  jobId: string
  description: string
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${description}"? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteScopeItemAction(itemId, jobId)
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete scope item')
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="ml-2 text-red-600 hover:text-red-500 disabled:text-gray-400"
      title="Delete item"
    >
      {isDeleting ? 'Deleting...' : 'Delete'}
    </button>
  )
}
