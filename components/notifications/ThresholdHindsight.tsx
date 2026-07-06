'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface JobVariance {
  name: string
  variancePct: number
}

interface BudgetVersionRow {
  version: number
  scope_items: {
    estimated_material_cost: number
    estimated_labor_hours: number
    estimated_labor_rate: number
    actual_material_cost: number
    actual_labor_hours: number
  }[] | null
}

/**
 * Shows how many alerts the current threshold would have produced against
 * the user's real jobs from the last 90 days, so the setting is trustworthy
 * before a single alert fires.
 */
export default function ThresholdHindsight({ threshold }: { threshold: number }) {
  const [variances, setVariances] = useState<JobVariance[] | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const supabase = createClient()
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('jobs')
        .select(
          'id, name, updated_at, budget_versions(version, scope_items(estimated_material_cost, estimated_labor_hours, estimated_labor_rate, actual_material_cost, actual_labor_hours))'
        )
        .gte('updated_at', since)

      if (cancelled) return
      if (error || !data) {
        setVariances([])
        return
      }

      const result: JobVariance[] = []
      for (const job of data) {
        const versions = (job.budget_versions ?? []) as BudgetVersionRow[]
        if (versions.length === 0) continue

        // Same math as the job detail page: latest budget version only
        const latest = versions.reduce((a, b) => (a.version > b.version ? a : b))
        const items = latest.scope_items ?? []
        if (items.length === 0) continue

        let estimated = 0
        let actual = 0
        for (const item of items) {
          estimated += item.estimated_material_cost + item.estimated_labor_hours * item.estimated_labor_rate
          actual += item.actual_material_cost + item.actual_labor_hours * item.estimated_labor_rate
        }
        if (estimated <= 0) continue

        result.push({ name: job.name, variancePct: ((actual - estimated) / estimated) * 100 })
      }

      setVariances(result)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const over = useMemo(
    () => (variances ?? []).filter((v) => v.variancePct >= threshold),
    [variances, threshold]
  )

  if (variances === null) {
    return <p className="mt-2 text-sm text-gray-400">Checking your last 90 days&hellip;</p>
  }
  if (variances.length === 0) {
    return null
  }

  const preview = over.slice(0, 3).map((v) => v.name).join(', ')

  return (
    <p className="mt-2 text-sm text-gray-600" aria-live="polite">
      At <span className="font-semibold">{threshold}%</span>, you&apos;d have gotten{' '}
      <span className="font-semibold">
        {over.length} alert{over.length === 1 ? '' : 's'}
      </span>{' '}
      in the last 90 days
      {over.length > 0 && (
        <span className="text-gray-500">
          {' '}({preview}{over.length > 3 ? ', …' : ''})
        </span>
      )}
      .
    </p>
  )
}
