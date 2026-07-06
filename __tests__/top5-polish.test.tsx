import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react'

// ---- Shared mocks -----------------------------------------------------------

const routerPush = vi.fn()
const routerRefresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush, refresh: routerRefresh, replace: vi.fn() }),
  usePathname: () => '/jobs/test-job',
}))

// ThresholdHindsight queries Supabase; resolve the chain at .gte()
const mockGte = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(() => ({ select: vi.fn(() => ({ gte: mockGte })) })),
  }),
}))

import CountUp from '../app/(protected)/dashboard/CountUp'
import PrintButton from '../app/(protected)/jobs/[id]/PrintButton'
import CSVImportButton from '../app/(protected)/jobs/[id]/CSVImportButton'
import ThresholdHindsight from '../components/notifications/ThresholdHindsight'

function mockMatchMedia(reducedMotion: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reducedMotion : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockMatchMedia(true) // deterministic: reduced motion renders final values
})

afterEach(() => {
  cleanup()
  document.documentElement.classList.remove('print-client', 'print-internal')
})

// ---- CountUp ----------------------------------------------------------------

describe('CountUp', () => {
  it('renders the final formatted value with prefix and suffix (reduced motion)', () => {
    render(<CountUp value={12345.678} prefix="$" decimals={1} />)
    expect(screen.getByText('$12,345.7')).toBeDefined()
  })

  it('animates toward the value when motion is allowed', async () => {
    mockMatchMedia(false)
    render(<CountUp value={100} durationMs={50} />)
    await waitFor(() => {
      expect(screen.getByText('100')).toBeDefined()
    })
  })
})

// ---- PrintButton (Client/Internal toggle) ------------------------------------

describe('PrintButton', () => {
  beforeEach(() => {
    window.print = vi.fn()
  })

  it('opens the menu with both print modes', () => {
    render(<PrintButton />)
    fireEvent.click(screen.getByText('Print/PDF ▾'))
    expect(screen.getByText('Client version')).toBeDefined()
    expect(screen.getByText('Internal version')).toBeDefined()
  })

  it('client mode tags the document, stamps the footer, prints, and cleans up', () => {
    render(<PrintButton />)
    fireEvent.click(screen.getByText('Print/PDF ▾'))
    fireEvent.click(screen.getByText('Client version'))

    expect(document.documentElement.classList.contains('print-client')).toBe(true)
    expect(window.print).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.print-footer')?.textContent).toContain('Client Copy')
    expect(document.querySelector('.print-footer')?.textContent).toContain('RenoMargin')

    // afterprint removes the mode class so screen view is unaffected
    window.dispatchEvent(new Event('afterprint'))
    expect(document.documentElement.classList.contains('print-client')).toBe(false)
  })

  it('internal mode uses the internal stamp and class', () => {
    render(<PrintButton />)
    fireEvent.click(screen.getByText('Print/PDF ▾'))
    fireEvent.click(screen.getByText('Internal version'))

    expect(document.documentElement.classList.contains('print-internal')).toBe(true)
    expect(document.querySelector('.print-footer')?.textContent).toContain('Internal Copy')
  })
})

// ---- CSVImportButton (live row validation) -----------------------------------

describe('CSVImportButton validation preview', () => {
  it('flags bad rows with plain-English messages and counts ready rows', async () => {
    render(<CSVImportButton budgetVersionId="bv-1" />)
    fireEvent.click(screen.getByText('Import CSV'))

    const csv = [
      'description,category,estimated_material_cost,estimated_labor_hours,estimated_labor_rate,notes',
      'Demo old cabinets,Demo,500,8,50,',
      'Install cabinets,Cabinets,5000,abc,50,',
      ',Paint,100,2,50,',
    ].join('\n')
    const file = new File([csv], 'items.csv', { type: 'text/csv' })

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } })
    })

    await waitFor(() => {
      expect(screen.getByText(/1 ready/)).toBeDefined()
    })
    expect(screen.getByText(/2 need a fix/)).toBeDefined()
    expect(screen.getByText(/Labor hours isn't a number/)).toBeDefined()
    expect(screen.getByText(/Description is missing/)).toBeDefined()
    expect(screen.getByText('Import 3 Items')).toBeDefined()
  })
})

// ---- ThresholdHindsight -------------------------------------------------------

describe('ThresholdHindsight', () => {
  const jobs = (variants: Array<{ name: string; est: number; act: number }>) =>
    variants.map((v, i) => ({
      id: `job-${i}`,
      name: v.name,
      updated_at: new Date().toISOString(),
      budget_versions: [
        {
          version: 1,
          scope_items: [
            {
              estimated_material_cost: v.est,
              estimated_labor_hours: 0,
              estimated_labor_rate: 0,
              actual_material_cost: v.act,
              actual_labor_hours: 0,
            },
          ],
        },
      ],
    }))

  it('counts how many jobs would have alerted at the threshold', async () => {
    mockGte.mockResolvedValue({
      data: jobs([
        { name: 'Kitchen Remodel', est: 1000, act: 1300 }, // +30%
        { name: 'Bath Refresh', est: 1000, act: 1050 },    // +5%
        { name: 'Deck Build', est: 1000, act: 900 },       // -10%
      ]),
      error: null,
    })

    render(<ThresholdHindsight threshold={10} />)

    await waitFor(() => {
      expect(screen.getByText(/1 alert/)).toBeDefined()
    })
    expect(screen.getByText(/Kitchen Remodel/)).toBeDefined()
  })

  it('renders nothing when there is no recent job history', async () => {
    mockGte.mockResolvedValue({ data: [], error: null })
    const { container } = render(<ThresholdHindsight threshold={10} />)
    await waitFor(() => {
      expect(container.textContent).not.toContain('Checking')
    })
    expect(container.textContent).toBe('')
  })
})
