'use client'

import { useFormStatus } from 'react-dom'

interface SubmitButtonProps {
  idleLabel: string
  pendingLabel: string
  formAction: (formData: FormData) => void | Promise<void>
}

export default function SubmitButton({ idleLabel, pendingLabel, formAction }: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      formAction={formAction}
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="group relative flex w-full items-center justify-center gap-2 rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending && (
        <svg
          className="h-4 w-4 animate-spin text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {pending ? pendingLabel : idleLabel}
    </button>
  )
}
