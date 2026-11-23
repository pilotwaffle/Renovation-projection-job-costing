import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

const { initRevenueCat, getCustomerInfo } = vi.hoisted(() => ({
  initRevenueCat: vi.fn(),
  getCustomerInfo: vi.fn(),
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

vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    const err = new Error(`NEXT_REDIRECT:${path}`) as Error & { digest: string }
    err.digest = `NEXT_REDIRECT;push;${path}`
    throw err
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: async () => ({
        data: { user: { id: 'user-1', email: 'owner@example.com' } },
        error: null,
      }),
    },
  })),
}))

vi.mock('@/lib/revenuecat/client', () => ({
  initRevenueCat,
  getCustomerInfo,
}))

vi.mock('@/components/Navigation', () => ({
  default: () => <nav>Navigation</nav>,
}))

vi.mock('../app/(protected)/settings/account/DeleteAccountSection', () => ({
  default: () => <div>Delete account form</div>,
}))

import AccountSettingsPage from '../app/(protected)/settings/account/page'

const INTRO = 'Manage your subscription and account, including permanently deleting it.'
const PAID_PLAN = 'RenoMargin Pro is the paid plan for this account.'
const SUBSCRIBED = "You're subscribed to RenoMargin Pro."
const IOS_APP = 'Subscriptions are available in the RenoMargin iOS app'
const CHECKING = 'Checking your subscription…'
const UNKNOWN = "We couldn't check your subscription."

function bodyText(): string {
  return document.body.textContent ?? ''
}

describe('Account settings subscription', () => {
  beforeEach(() => {
    initRevenueCat.mockReset()
    getCustomerInfo.mockReset()
  })

  it('stays neutral while the RevenueCat check is loading', async () => {
    initRevenueCat.mockReturnValue(new Promise(() => {}))

    const ui = await AccountSettingsPage()
    render(ui)

    const subscription = screen.getByRole('heading', { name: 'Subscription' })
    const deleteAccount = screen.getByRole('heading', { name: 'Delete account' })
    expect(
      subscription.compareDocumentPosition(deleteAccount) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()

    expect(screen.getByText(CHECKING)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'View subscription' }).getAttribute('href')).toBe(
      '/paywall'
    )
    expect(subscription.closest('[aria-busy="true"]')).toBeTruthy()

    const text = bodyText()
    expect(text).not.toContain("You're subscribed")
    expect(text).not.toContain('Upgrade to Pro')

    await waitFor(() => {
      expect(initRevenueCat).toHaveBeenCalledWith('user-1')
    })
    expect(getCustomerInfo).not.toHaveBeenCalled()
  })

  it.each(['not-native', 'missing-key'] as const)(
    'stays neutral on web when RevenueCat init returns %s',
    async (reason) => {
      initRevenueCat.mockResolvedValue({ available: false, reason })
      getCustomerInfo.mockResolvedValue({
        available: true,
        entitlements: {
          proActive: true,
          activeEntitlements: ['pro'],
          allEntitlements: ['pro'],
        },
      })

      const ui = await AccountSettingsPage()
      render(ui)

      await waitFor(() => {
        expect(screen.getByText(IOS_APP)).toBeTruthy()
      })
      expect(screen.getByRole('link', { name: 'View subscription' }).getAttribute('href')).toBe(
        '/paywall'
      )

      const text = bodyText()
      expect(text).not.toContain("You're subscribed")
      expect(text).not.toContain('Upgrade to Pro')
      expect(initRevenueCat).toHaveBeenCalledWith('user-1')
      expect(getCustomerInfo).not.toHaveBeenCalled()
    }
  )

  it('keeps Upgrade to Pro when the pro entitlement is inactive', async () => {
    initRevenueCat.mockResolvedValue({ available: true })
    getCustomerInfo.mockResolvedValue({
      available: true,
      entitlements: {
        proActive: false,
        activeEntitlements: [],
        allEntitlements: ['pro'],
      },
    })

    const ui = await AccountSettingsPage()
    render(ui)

    await waitFor(() => {
      expect(screen.getByText(PAID_PLAN)).toBeTruthy()
    })
    expect(screen.getByRole('link', { name: 'Upgrade to Pro' }).getAttribute('href')).toBe(
      '/paywall'
    )

    const text = bodyText()
    expect(text).toContain(INTRO)
    expect(text).not.toContain("You're subscribed")
    expect(initRevenueCat).toHaveBeenCalledWith('user-1')
    expect(getCustomerInfo).toHaveBeenCalled()
  })

  it('shows the subscribed status when entitlements.proActive is true', async () => {
    initRevenueCat.mockResolvedValue({ available: true })
    getCustomerInfo.mockResolvedValue({
      available: true,
      entitlements: {
        proActive: true,
        activeEntitlements: ['pro'],
        allEntitlements: ['pro'],
      },
    })

    const ui = await AccountSettingsPage()
    render(ui)

    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain(SUBSCRIBED)
    })
    expect(screen.getByRole('link', { name: 'Manage subscription' }).getAttribute('href')).toBe(
      '/paywall'
    )

    const text = bodyText()
    expect(text).not.toContain('Upgrade to Pro')
    expect(text).not.toContain(PAID_PLAN)
    expect(screen.queryByRole('link', { name: 'Upgrade to Pro' })).toBeNull()
    expect(initRevenueCat).toHaveBeenCalledWith('user-1')
    expect(getCustomerInfo).toHaveBeenCalled()
  })

  it('stays neutral when RevenueCat init fails', async () => {
    initRevenueCat.mockResolvedValue({ available: false, reason: 'error' })

    const ui = await AccountSettingsPage()
    render(ui)

    await waitFor(() => {
      expect(screen.getByText(UNKNOWN)).toBeTruthy()
    })
    expect(screen.getByRole('link', { name: 'View subscription' }).getAttribute('href')).toBe(
      '/paywall'
    )

    const text = bodyText()
    expect(text).not.toContain("You're subscribed")
    expect(text).not.toContain('Upgrade to Pro')
    expect(initRevenueCat).toHaveBeenCalledWith('user-1')
    expect(getCustomerInfo).not.toHaveBeenCalled()
  })

  it('stays neutral when customer info fails after a successful init', async () => {
    initRevenueCat.mockResolvedValue({ available: true })
    getCustomerInfo.mockResolvedValue({ available: false, reason: 'error' })

    const ui = await AccountSettingsPage()
    render(ui)

    await waitFor(() => {
      expect(screen.getByText(UNKNOWN)).toBeTruthy()
    })
    expect(screen.getByRole('link', { name: 'View subscription' }).getAttribute('href')).toBe(
      '/paywall'
    )

    const text = bodyText()
    expect(text).not.toContain("You're subscribed")
    expect(text).not.toContain('Upgrade to Pro')
    expect(initRevenueCat).toHaveBeenCalledWith('user-1')
    expect(getCustomerInfo).toHaveBeenCalled()
  })
})
