import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react'
import React from 'react'

// ---- Shared mocks -----------------------------------------------------------

const routerPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush, refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/dashboard',
}))

const importScopeItemsAction = vi.fn()
vi.mock('../app/(protected)/jobs/[id]/csv/actions', () => ({
  importScopeItemsAction: (...args: unknown[]) => importScopeItemsAction(...args),
}))

// ThresholdHindsight (rendered inside NotificationSettings) queries Supabase
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({ gte: vi.fn().mockResolvedValue({ data: [], error: null }) })),
    })),
  }),
}))

vi.mock('@/lib/notifications', () => ({
  notificationService: {
    getPreferences: vi.fn().mockResolvedValue(null),
    updatePreferences: vi.fn(),
    sendTestNotification: vi.fn(),
  },
}))

// recharts' ResponsiveContainer measures the DOM and renders nothing at 0x0
// in jsdom; substitute a fixed-size container so the chart mounts for real.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>()
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) =>
      React.cloneElement(children, { width: 500, height: 300 } as object),
  }
})

import CSVImportButton from '../app/(protected)/jobs/[id]/CSVImportButton'
import { VarianceChart } from '../app/(protected)/dashboard/Charts'
import { NotificationSettings } from '../components/notifications/NotificationSettings'

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

// ---- CSV import: clean-import message + reduced motion -----------------------

async function loadCsvAndImport(csv: string, readyCount: number) {
  render(<CSVImportButton budgetVersionId="bv-1" />)
  fireEvent.click(screen.getByText('Import CSV'))

  const file = new File([csv], 'items.csv', { type: 'text/csv' })
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })

  // The file parse is async (FileReader); wait for the validation preview
  // before the import button reflects the real row count.
  await waitFor(() => {
    expect(screen.getByText(new RegExp(`${readyCount} ready`))).toBeDefined()
  })
  const importButton = screen.getByText(
    `Import ${readyCount} Item${readyCount === 1 ? '' : 's'}`
  )
  await act(async () => {
    fireEvent.click(importButton)
  })
}

describe('CSV clean-import message', () => {
  const header =
    'description,category,estimated_material_cost,estimated_labor_hours,estimated_labor_rate,notes'

  it('shows the clean-import message only when nothing was skipped', async () => {
    importScopeItemsAction.mockResolvedValue({ imported: 2, errors: [] })
    await loadCsvAndImport(
      [header, 'Demo,Demo,500,8,50,', 'Paint,Paint,100,2,50,'].join('\n'),
      2
    )

    await waitFor(() => {
      expect(screen.getByText(/2 of 2 rows imported/)).toBeDefined()
    })
    expect(
      screen.getByText('Clean import — every row was imported successfully.')
    ).toBeDefined()
  })

  it('does not claim a clean import when rows were skipped', async () => {
    importScopeItemsAction.mockResolvedValue({ imported: 1, errors: [] })
    await loadCsvAndImport(
      [header, 'Demo,Demo,500,8,50,', ',Paint,100,2,50,'].join('\n'), // row 2 invalid
      1
    )

    await waitFor(() => {
      expect(screen.getByText(/1 of 1 rows imported/)).toBeDefined()
    })
    expect(screen.queryByText(/Clean import/)).toBeNull()
    expect(screen.getByText(/1 row skipped/)).toBeDefined()
  })
})

describe('CSV row animation reduced-motion support', () => {
  it('ships a prefers-reduced-motion rule disabling the csv-row-in animation', () => {
    render(<CSVImportButton budgetVersionId="bv-1" />)
    const styles = [...document.querySelectorAll('style')]
      .map((s) => s.textContent || '')
      .join('\n')
    const reducedBlock = styles.match(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\}\s*\}/
    )?.[0]
    expect(reducedBlock).toBeDefined()
    expect(reducedBlock).toContain('.csv-row-in')
    expect(reducedBlock).toContain('animation: none')
  })
})

// ---- Variance chart keyboard accessibility -----------------------------------

describe('VarianceChart keyboard accessibility', () => {
  const data = [
    { id: 'job-1', name: 'Kitchen', variance: 12 },
    { id: 'job-2', name: 'Bath', variance: -5 },
    { name: 'No Id Job', variance: 3 }, // no id -> no keyboard control
  ]

  it('renders a focusable, labeled keyboard control per navigable bar', () => {
    render(<VarianceChart data={data} />)
    const controls = screen.getAllByRole('button', { name: /Open job/ })
    expect(controls.length).toBe(2)
    expect(controls[0].textContent).toContain('Kitchen')
    expect(controls[0].textContent).toContain('12')
    expect(controls[1].textContent).toContain('Bath')
  })

  it('activating a control navigates to that job', () => {
    render(<VarianceChart data={data} />)
    const controls = screen.getAllByRole('button', { name: /Open job/ })

    fireEvent.click(controls[0]) // native buttons fire click for Enter/Space
    expect(routerPush).toHaveBeenCalledWith('/jobs/job-1')

    fireEvent.click(controls[1])
    expect(routerPush).toHaveBeenCalledWith('/jobs/job-2')
  })
})

// ---- Variance threshold slider/input range agreement --------------------------

describe('NotificationSettings threshold range consistency', () => {
  it('slider and number input agree on min/max', async () => {
    render(<NotificationSettings userId="user-1" />)

    const slider = (await screen.findByLabelText(
      'Variance threshold slider'
    )) as HTMLInputElement
    const numberInput = document.getElementById(
      'variance_threshold_percentage'
    ) as HTMLInputElement

    expect(slider.min).toBe(numberInput.min)
    expect(slider.max).toBe(numberInput.max)
    expect(slider.max).toBe('100')
  })
})
