'use client'

import { useState } from 'react'
import { deleteAccountAction } from './actions'
import { isDeletionConfirmed } from './deletion-rules'

interface DeleteAccountSectionProps {
  email: string
}

export default function DeleteAccountSection({ email }: DeleteAccountSectionProps) {
  const [confirmation, setConfirmation] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isConfirmed = isDeletionConfirmed(confirmation, email)

  async function handleDelete() {
    if (!isConfirmed || pending) return
    setPending(true)
    setError(null)
    try {
      const result = await deleteAccountAction(confirmation)
      // On success the server action redirects and this line is not
      // reached. If we do get a result back, it means deletion failed.
      if (result?.error) {
        setError(result.error)
        setPending(false)
      }
    } catch (err) {
      // next/navigation's redirect() throws a special error that Next
      // handles internally; rethrow anything that isn't that so real
      // failures still surface, but avoid showing an error for redirects.
      if (
        err &&
        typeof err === 'object' &&
        'digest' in err &&
        typeof (err as { digest?: unknown }).digest === 'string' &&
        (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
      ) {
        throw err
      }
      console.error('Account deletion failed', err)
      setError('An unexpected error occurred. Please try again.')
      setPending(false)
    }
  }

  return (
    <div className="mt-6 border-t border-gray-200 pt-6">
      <label
        htmlFor="delete-confirmation"
        className="block text-sm font-medium text-gray-900"
      >
        Type <span className="font-mono font-semibold">DELETE</span> or your
        account email (<span className="font-mono">{email}</span>) to confirm
      </label>
      <input
        id="delete-confirmation"
        type="text"
        value={confirmation}
        onChange={(e) => setConfirmation(e.target.value)}
        disabled={pending}
        placeholder="DELETE"
        autoComplete="off"
        className="mt-2 block w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500"
      />

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleDelete}
        disabled={!isConfirmed || pending}
        className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-red-300"
      >
        {pending ? 'Deleting account…' : 'Permanently delete my account'}
      </button>
    </div>
  )
}
