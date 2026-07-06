'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import CountUp from '../../dashboard/CountUp'

interface TemplateAppliedToastProps {
  itemCount: number
  totalEstimated: number
}

/**
 * Shown once after a job is created from a template: counts up the estimate
 * total and makes the time saved visceral. Cleans ?applied=1 from the URL so
 * a refresh doesn't replay it.
 */
export default function TemplateAppliedToast({ itemCount, totalEstimated }: TemplateAppliedToastProps) {
  const [visible, setVisible] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // ~3 minutes of typing per line item, rounded to a friendly 5
  const minutesSaved = Math.max(5, Math.round((itemCount * 3) / 5) * 5)

  useEffect(() => {
    // Drop the query param without a navigation so refresh won't replay
    window.history.replaceState(null, '', pathname)

    const timer = setTimeout(() => setVisible(false), 6000)
    return () => clearTimeout(timer)
  }, [pathname, router])

  if (!visible) return null

  return (
    <div
      className="fixed bottom-6 right-6 z-50 max-w-sm rounded-lg bg-gray-900 px-4 py-3 text-white shadow-xl print:hidden"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-semibold">
        {itemCount} item{itemCount === 1 ? '' : 's'} added ·{' '}
        <CountUp value={totalEstimated} prefix="$" durationMs={1200} /> estimated
      </p>
      <p className="mt-0.5 text-xs text-gray-300">
        You just skipped ~{minutesSaved} minutes of typing.
      </p>
      <button
        onClick={() => setVisible(false)}
        className="absolute right-2 top-2 text-gray-400 hover:text-white"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}
