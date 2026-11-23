import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { ReactNode } from 'react'

const {
  getUser,
  initRevenueCat,
  rcLogIn,
  getCustomerInfo,
  loadProMonthlyProduct,
  purchaseProMonthly,
  restorePurchases,
} = vi.hoisted(() => ({
  getUser: vi.fn(),
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
      getUser,
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

const LOAD_FAILURE = "We couldn't load subscription details. Check your connection and try again."
const PURCHASE_FAILURE = "We couldn't complete the purchase. You weren't charged. Please try again."
const RESTORE_FAILURE = "We couldn't restore purchases. Please try again."
const PENDING_STATUS = "Purchase pending approval. You'll get access once it's approved."
const IOS_APP = 'Subscriptions are available in the RenoMargin iOS app'

function subscribeButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Subscribe' }) as HTMLButtonElement
}

function restoreButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Restore Purchases' }) as HTMLButtonElement
}

beforeEach(() => {
  vi.clearAllMocks()
  getUser.mockReset()
  getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  initRevenueCat.mockReset()
  initRevenueCat.mockResolvedValue({ available: true })
  rcLogIn.mockReset()
  rcLogIn.mockResolvedValue({
    available: true,
    created: false,
    entitlements: IDLE_ENTITLEMENTS,
  })
  getCustomerInfo.mockReset()
  getCustomerInfo.mockResolvedValue({
    available: true,
    entitlements: IDLE_ENTITLEMENTS,
  })
  loadProMonthlyProduct.mockReset()
  loadProMonthlyProduct.mockResolvedValue({
    available: true,
    product: MONTHLY_PRODUCT,
  })
  purchaseProMonthly.mockReset()
  purchaseProMonthly.mockResolvedValue({ available: true, cancelled: true })
  restorePurchases.mockReset()
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
  expect(initRevenueCat).toHaveBeenCalledWith('user-1')
  expect(rcLogIn).not.toHaveBeenCalled()
}

describe('PaywallPage', () => {
  it('shows a loading state and no Subscribe button while the product is deferred', () => {
    loadProMonthlyProduct.mockReturnValue(new Promise(() => {}))
    render(<PaywallPage />)
    const loading = screen.getByRole('button', { name: 'Loading price…' }) as HTMLButtonElement
    expect(loading.disabled).toBe(true)
    expect(screen.queryByRole('button', { name: 'Subscribe' })).toBeNull()
    expect(document.body.textContent).not.toContain('$19.99')
  })

  it('renders Subscribe only after the store price, length, and disclosure are shown', async () => {
    await renderReady()
    const text = document.body.textContent ?? ''
    expect(text).toContain('$19.99')
    expect(text).toContain('1 month')
    expect(text).toContain('per month')
    expect(text).toContain('auto-renewing')
    expect(text).toContain('cancelled at least 24 hours')
    expect(text).toContain('App Store account settings')
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeDefined()
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
    expect(screen.getByRole('alert').textContent?.trim()).toBe('')
    expect(screen.queryByText(/complete the purchase/)).toBeNull()
  })

  it('shows a friendly purchase error and hides the raw store text', async () => {
    purchaseProMonthly.mockResolvedValue({
      available: false,
      reason: 'error',
      message: 'Store problem',
    })
    await renderReady()
    expect(() => {
      fireEvent.click(subscribeButton())
    }).not.toThrow()
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(PURCHASE_FAILURE)
    })
    expect(document.body.textContent).not.toContain('Store problem')
    await waitFor(() => {
      expect(subscribeButton().disabled).toBe(false)
    })
  })

  it.each(['not-native', 'missing-key'] as const)(
    'shows the iOS fallback without Subscribe when init is %s',
    async (reason) => {
      initRevenueCat.mockResolvedValue({ available: false, reason })
      render(<PaywallPage />)
      expect(await screen.findByText(IOS_APP)).toBeDefined()
      expect(screen.queryByRole('button', { name: 'Subscribe' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
      expect(restoreButton().disabled).toBe(true)
    }
  )

  it('offers Try again when the store has no offering and keeps Restore enabled', async () => {
    loadProMonthlyProduct.mockResolvedValue({ available: false, reason: 'no-offerings' })
    render(<PaywallPage />)
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeDefined()
    expect(screen.getByRole('alert').textContent).toContain(LOAD_FAILURE)
    expect(screen.queryByText(IOS_APP)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Subscribe' })).toBeNull()
    expect(restoreButton().disabled).toBe(false)
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
    fireEvent.click(restoreButton())
    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain("You're subscribed to RenoMargin Pro.")
    })
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

  it('keeps Subscribe hidden for a load error', async () => {
    loadProMonthlyProduct.mockResolvedValue({
      available: false,
      reason: 'error',
      message: 'E_RAW_LOAD',
    })
    render(<PaywallPage />)
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeDefined()
    expect(screen.getByRole('alert').textContent).toContain(LOAD_FAILURE)
    expect(document.body.textContent).not.toContain('E_RAW_LOAD')
    expect(screen.queryByRole('button', { name: 'Subscribe' })).toBeNull()
  })

  it('tells the user to restore when payment is received but pro is inactive', async () => {
    purchaseProMonthly.mockResolvedValue({
      available: true,
      cancelled: false,
      productId: 'com.torq.renomargin.pro.monthly',
      entitlements: IDLE_ENTITLEMENTS,
    })
    await renderReady()
    fireEvent.click(subscribeButton())
    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain('Payment received')
    })
    const status = screen.getByRole('status').textContent?.replace(/\s+/g, ' ').trim()
    expect(status).toBe(
      "Payment received. Tap Restore Purchases to finish unlocking RenoMargin Pro. If it still doesn't unlock, contact Support."
    )
    expect(screen.getByRole('link', { name: 'Support' }).getAttribute('href')).toBe('/support')
    expect(restoreButton().disabled).toBe(false)
    expect(screen.queryByRole('button', { name: 'Subscribe' })).toBeNull()
  })

  it('shows Ask to Buy as a status, not a purchase failure', async () => {
    purchaseProMonthly.mockResolvedValue({ available: true, pending: true })
    await renderReady()
    fireEvent.click(subscribeButton())
    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain(PENDING_STATUS)
    })
    expect(screen.getByRole('alert').textContent?.trim()).toBe('')
    expect(screen.queryByText(PURCHASE_FAILURE)).toBeNull()
    expect(subscribeButton().disabled).toBe(false)
  })

  it('retries a missing offering and then shows Subscribe', async () => {
    loadProMonthlyProduct.mockResolvedValueOnce({ available: false, reason: 'no-offerings' })
    render(<PaywallPage />)
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeDefined()
    expect(restoreButton().disabled).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => {
      expect(subscribeButton().disabled).toBe(false)
    })
    expect(loadProMonthlyProduct).toHaveBeenCalledTimes(2)
  })

  it('retries a plugin load failure without showing the raw SDK text', async () => {
    initRevenueCat.mockResolvedValueOnce({
      available: false,
      reason: 'error',
      message: 'Purchases plugin is not implemented on ios',
    })
    render(<PaywallPage />)
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeDefined()
    expect(screen.getByRole('alert').textContent).toContain(LOAD_FAILURE)
    expect(document.body.textContent).not.toContain('plugin is not implemented')
    expect(restoreButton().disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => {
      expect(subscribeButton().disabled).toBe(false)
    })
    expect(initRevenueCat).toHaveBeenCalledTimes(2)
  })

  it('hides a raw purchase SDK message from the page', async () => {
    purchaseProMonthly.mockResolvedValue({
      available: false,
      reason: 'error',
      message: 'E_RAW_SDK_BLOB',
    })
    await renderReady()
    fireEvent.click(subscribeButton())
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(PURCHASE_FAILURE)
    })
    expect(document.body.textContent).not.toContain('E_RAW_SDK_BLOB')
  })

  it('shows friendly restore failure copy without the raw SDK text', async () => {
    restorePurchases.mockResolvedValue({
      available: false,
      reason: 'error',
      message: 'E_RAW_RESTORE',
    })
    await renderReady()
    fireEvent.click(restoreButton())
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(RESTORE_FAILURE)
    })
    expect(document.body.textContent).not.toContain('E_RAW_RESTORE')
  })

  it('configures RevenueCat with the signed-in Supabase id and does not call rcLogIn', async () => {
    await renderReady()
    expect(initRevenueCat).toHaveBeenCalledTimes(1)
    expect(rcLogIn).not.toHaveBeenCalled()
  })

  it('does not offer purchase when nobody is signed in', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    render(<PaywallPage />)
    const link = await screen.findByRole('link', { name: 'Sign in to subscribe' })
    expect(link.getAttribute('href')).toBe('/login')
    expect(initRevenueCat).not.toHaveBeenCalled()
    expect(purchaseProMonthly).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Subscribe' })).toBeNull()
    expect(restoreButton().disabled).toBe(true)
  })

  it('logs a session lookup failure without the user id and stays signed out', async () => {
    const spy = vi.spyOn(console, 'error')
    getUser.mockRejectedValue(new Error('user-1 blew up'))
    render(<PaywallPage />)
    expect(await screen.findByRole('link', { name: 'Sign in to subscribe' })).toBeDefined()
    expect(initRevenueCat).not.toHaveBeenCalled()
    const logged = spy.mock.calls.map((call) => String(call[0])).join('\n')
    expect(logged).toContain('[paywall] session lookup failed')
    expect(logged).not.toContain('user-1')
  })

  it('logs the user in with RevenueCat when the Supabase id changes before purchase', async () => {
    await renderReady()
    getUser.mockResolvedValue({ data: { user: { id: 'user-2' } }, error: null })
    fireEvent.click(subscribeButton())
    await waitFor(() => {
      expect(initRevenueCat).toHaveBeenCalledWith('user-2')
      expect(purchaseProMonthly).toHaveBeenCalled()
    })
  })

  it('mounts the live regions before any message and focuses the success status', async () => {
    const view = render(<PaywallPage />)
    expect(screen.getByRole('status').textContent?.trim()).toBe('')
    expect(screen.getByRole('alert').textContent?.trim()).toBe('')
    view.unmount()

    purchaseProMonthly.mockResolvedValue({
      available: true,
      cancelled: false,
      productId: 'com.torq.renomargin.pro.monthly',
      entitlements: {
        proActive: true,
        activeEntitlements: ['pro'],
        allEntitlements: ['pro'],
      },
    })
    render(<PaywallPage />)
    await waitFor(() => {
      expect(subscribeButton().disabled).toBe(false)
    })
    fireEvent.click(subscribeButton())
    await waitFor(() => {
      const status = screen.getByRole('status')
      expect(status.textContent).toContain("You're subscribed to RenoMargin Pro.")
      expect(document.activeElement).toBe(status)
    })
  })
})
