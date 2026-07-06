'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteTemplateAction } from './actions'

/**
 * Client component for template deletion. The confirm() dialog and onClick
 * handler cannot live in the server-rendered TemplateCard — passing event
 * handlers from a Server Component crashes the App Router at render time.
 */
export default function DeleteTemplateButton({ templateId }: { templateId: string }) {
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this template? This cannot be undone.')) {
      return
    }
    setDeleting(true)
    try {
      await deleteTemplateAction(templateId)
      router.refresh()
    } catch (error) {
      console.error('Failed to delete template:', error)
      setDeleting(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm disabled:bg-gray-400"
    >
      {deleting ? 'Deleting…' : 'Delete'}
    </button>
  )
}
