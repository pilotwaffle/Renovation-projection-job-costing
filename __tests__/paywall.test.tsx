import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { ReactNode } from 'react'

const {
  initRevenueCat,
  rcLogIn,
  getCustomerInfo,
  loadProMonthlyProduct,
  purchaseProMonthly,
  restorePurchases,
} = vi.hoisted(() => ({
  initRevenueCat: vi.fn(),
  rcLogIn: vi.fn(),
  getCustomerInfo: vi.fn(),
  loadProMonthlyProduct: vi.fn(),
  purchaseProMonthly: vi.fn(),
  restorePurchases: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string
    children?: ReactNode
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: null } }),
    },
  }),
}))

vi.mock('@/lib/revenuecat/client', () => ({
  PRO_MONTHLY_PRODUCT_ID: 'com.torq.renomargin.pro.monthly',
  initRevenueCat,
  rcLogIn,
  getCustomerInfo,
  loadProMonthlyProduct,
  purchaseProMonthly,
  restorePurchases,
}))

import PaywallPage from '../app/paywall/page'

const MONTHLY_PRODUCT = {
  productId: 'com.torq.renomargin.pro.monthly',
  priceString: '$19.99',
  subscriptionPeriod: 'P1M',
  intro: null,
}

const IDLE_ENTITLEMENTS = {
  proActive: false,
  activeEntitlements: [] as string[],
  allEntitlements: [] as string[],
}

function subscribeButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Subscribe' }) as HTMLButtonElement
}

beforeEach(() => {
  vi.clearAllMocks()
  initRevenueCat.mockResolvedValue({ available: true })
  rcLogIn.mockResolvedValue({
    available: true,
    created: false,
    entitlements: IDLE_ENTITLEMENTS,
  })
  getCustomerInfo.mockResolvedValue({
    available: true,
    entitlements: IDLE_ENTITLEMENTS,
  })
  loadProMonthlyProduct.mockResolvedValue({
    available: true,
    product: MONTHLY_PRODUCT,
  })
  purchaseProMonthly.mockResolvedValue({ available: true, cancelled: true })
  restorePurchases.mockResolvedValue({
    available: true,
    entitlements: IDLE_ENTITLEMENTS,
  })
})

afterEach(() => {
  cleanup()
})

async function renderReady() {
  render(<PaywallPage />)
  await waitFor(() => {
    expect(subscribeButton().disabled).toBe(false)
  })
}

describe('PaywallPage', () => {
  it('shows a loading state and no price while the product is deferred', () => {
    loadProMonthlyProduct.mockReturnValue(new Promise(() => {}))
    render(<PaywallPage />)
    expect(screen.getByText('Loading subscription price…')).toBeDefined()
    expect(subscribeButton().disabled).toBe(true)
    expect(document.body.textContent).not.toContain('$19.99')
  })

  it('renders the store price, length, and auto-renew disclosure from the runtime product', async () => {
    await renderReady()
    const text = document.body.textContent ?? ''
    expect(text).toContain('$19.99')
    expect(text).toContain('1 month')
    expect(text).toContain('per month')
    expect(text).toContain('auto-renewing')
    expect(text).toContain('cancelled at least 24 hours')
    expect(text).toContain('App Store account settings')
    expect(screen.queryByText(/Free trial/)).toBeNull()
  })

  it('calls purchaseProMonthly with the monthly product id', async () => {
    await renderReady()
    fireEvent.click(subscribeButton())
    await waitFor(() => {
      expect(purchaseProMonthly).toHaveBeenCalledWith('com.torq.renomargin.pro.monthly')
    })
  })

  it('shows no error when the purchase is cancelled', async () => {
    purchaseProMonthly.mockResolvedValue({ available: true, cancelled: true })
    await renderReady()
    fireEvent.click(subscribeButton())
    await waitFor(() => {
      expect(purchaseProMonthly).toHaveBeenCalled()
      expect(subscribeButton().disabled).toBe(false)
    })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByText(/Couldn't complete the purchase/)).toBeNull()
  })

  it('shows the store error without throwing', async () => {
    purchaseProMonthly.mockResolvedValue({
      available: false,
      reason: 'error',
      message: 'Store problem',
    })
    await renderReady()
    expect(() => {
      fireEvent.click(subscribeButton())
    }).not.toThrow()
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('Store problem')
    expect(alert.textContent).toContain("Couldn't complete the purchase.")
    await waitFor(() => {
      expect(subscribeButton().disabled).toBe(false)
    })
  })

  it.each(['not-native', 'missing-key'] as const)(
    'disables Subscribe when init is %s',
    async (reason) => {
      initRevenueCat.mockResolvedValue({ available: false, reason })
      render(<PaywallPage />)
      expect(
        await screen.findByText('Subscriptions are available in the RenoMargin iOS app')
      ).toBeDefined()
      expect(subscribeButton().disabled).toBe(true)
      expect(
        (screen.getByRole('button', { name: 'Restore Purchases' }) as HTMLButtonElement).disabled
      ).toBe(true)
    }
  )

  it('disables Subscribe when the store has no offering', async () => {
    loadProMonthlyProduct.mockResolvedValue({ available: false, reason: 'no-offerings' })
    render(<PaywallPage />)
    expect(
      await screen.findByText('Subscriptions are available in the RenoMargin iOS app')
    ).toBeDefined()
    expect(subscribeButton().disabled).toBe(true)
  })

  it('links to Terms, Privacy, and Support', async () => {
    await renderReady()
    expect(screen.getByRole('link', { name: 'Terms of Use' }).getAttribute('href')).toBe('/terms')
    expect(screen.getByRole('link', { name: 'Privacy Policy' }).getAttribute('href')).toBe(
      '/privacy'
    )
    expect(screen.getByRole('link', { name: /Support/ }).getAttribute('href')).toBe('/support')
  })

  it('restores purchases and shows Pro when the entitlement is active', async () => {
    restorePurchases.mockResolvedValue({
      available: true,
      entitlements: {
        proActive: true,
        activeEntitlements: ['pro'],
        allEntitlements: ['pro'],
      },
    })
    await renderReady()
    fireEvent.click(screen.getByRole('button', { name: 'Restore Purchases' }))
    expect(await screen.findByRole('status')).toBeDefined()
    expect(screen.getByText("You're subscribed to RenoMargin Pro.")).toBeDefined()
    expect(restorePurchases).toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Subscribe' })).toBeNull()
  })

  it('shows a free trial only when the store sends one', async () => {
    loadProMonthlyProduct.mockResolvedValue({
      available: true,
      product: {
        ...MONTHLY_PRODUCT,
        intro: {
          price: 0,
          priceString: '$0.00',
          period: 'P3D',
          periodUnit: 'DAY',
          periodNumberOfUnits: 3,
          cycles: 1,
        },
      },
    })
    await renderReady()
    expect(document.body.textContent).toContain('Free trial: 3 days.')
    expect(document.body.textContent).toContain(
      'Any unused portion of a free trial, if offered, is forfeited when you purchase this subscription.'
    )
  })

  it('does not hardcode a dollar amount in the paywall source', () => {
    const files = [
      'app/paywall/page.tsx',
      'app/paywall/PaywallPurchase.tsx',
      'app/paywall/subscription-copy.ts',
    ]
    for (const file of files) {
      const source = readFileSync(path.join(process.cwd(), file), 'utf8')
      expect(source).not.toMatch(/\$\d/)
    }
  })
})
