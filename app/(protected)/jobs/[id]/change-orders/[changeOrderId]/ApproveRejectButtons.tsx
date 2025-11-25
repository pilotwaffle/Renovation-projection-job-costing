'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { approveChangeOrderAction, rejectChangeOrderAction } from '../actions'

export function ApproveRejectButtons({
  changeOrderId,
  jobId
}: {
  changeOrderId: string
  jobId: string
}) {
  const router = useRouter()
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this change order?')) {
      return
    }

    setIsApproving(true)
    setError(null)

    try {
      await approveChangeOrderAction(changeOrderId, jobId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve')
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!confirm('Are you sure you want to reject this change order?')) {
      return
    }

    setIsRejecting(true)
    setError(null)

    try {
      await rejectChangeOrderAction(changeOrderId, jobId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject')
      setIsRejecting(false)
    }
  }

  return (
    <div className="mb-8">
      {error && (
        <div className="rounded-md bg-red-50 p-4 mb-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      <div className="flex gap-4">
        <button
          onClick={handleApprove}
          disabled={isApproving || isRejecting}
          className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isApproving ? 'Approving...' : 'Approve Change Order'}
        </button>
        <button
          onClick={handleReject}
          disabled={isApproving || isRejecting}
          className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isRejecting ? 'Rejecting...' : 'Reject Change Order'}
        </button>
      </div>
    </div>
  )
}
