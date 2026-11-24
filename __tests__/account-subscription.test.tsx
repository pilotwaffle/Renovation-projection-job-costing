import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

const { initRevenueCat, getCustomerInfo, getUser } = vi.hoisted(() => ({
  initRevenueCat: vi.fn(),
  getCustomerInfo: vi.fn(),
  getUser: vi.fn(),
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
      getUser,
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
const UNSUBSCRIBED = 'Upgrade to RenoMargin Pro to unlock paid features.'
const SUBSCRIBED = "You're subscribed to RenoMargin Pro."
const IOS_APP = 'Subscriptions are available in the RenoMargin iOS app.'
const CHECKING = 'Checking your subscription…'
const UNKNOWN = "We couldn't check your subscription. Open your subscription to try again."

function bodyText(): string {
  return document.body.textContent ?? ''
}

describe('Account settings subscription', () => {
  beforeEach(() => {
    initRevenueCat.mockReset()
    getCustomerInfo.mockReset()
    getUser.mockReset()
    getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'owner@example.com' } },
      error: null,
    })
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

    expect(screen.getByRole('status').textContent).toContain(CHECKING)
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
        expect(screen.getByRole('status').textContent).toContain(IOS_APP)
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

  it('keeps Upgrade to Pro when pro is inactive', async () => {
    initRevenueCat.mockResolvedValue({ available: true })
    getCustomerInfo.mockResolvedValue({
      available: true,
      entitlements: {
        proActive: false,
        activeEntitlements: [],
        allEntitlements: [],
      },
    })

    const ui = await AccountSettingsPage()
    render(ui)

    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain(UNSUBSCRIBED)
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

  it('does not treat pro in allEntitlements as subscribed when it is inactive', async () => {
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
      expect(screen.getByRole('status').textContent).toContain(UNSUBSCRIBED)
    })
    expect(screen.getByRole('link', { name: 'Upgrade to Pro' }).getAttribute('href')).toBe(
      '/paywall'
    )
    expect(bodyText()).not.toContain("You're subscribed")
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
    expect(screen.getByRole('link', { name: 'View subscription' }).getAttribute('href')).toBe(
      '/paywall'
    )
    expect(screen.queryByRole('link', { name: 'Manage subscription' })).toBeNull()

    const text = bodyText()
    expect(text).not.toContain('Upgrade to Pro')
    expect(text).not.toContain(UNSUBSCRIBED)
    expect(screen.queryByRole('link', { name: 'Upgrade to Pro' })).toBeNull()
    expect(initRevenueCat).toHaveBeenCalledWith('user-1')
    expect(getCustomerInfo).toHaveBeenCalled()
  })

  it('stays neutral when RevenueCat init fails', async () => {
    initRevenueCat.mockResolvedValue({ available: false, reason: 'error' })

    const ui = await AccountSettingsPage()
    render(ui)

    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain(UNKNOWN)
    })
    expect(screen.getByRole('link', { name: 'Check subscription' }).getAttribute('href')).toBe(
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
      expect(screen.getByRole('status').textContent).toContain(UNKNOWN)
    })
    expect(screen.getByRole('link', { name: 'Check subscription' }).getAttribute('href')).toBe(
      '/paywall'
    )

    const text = bodyText()
    expect(text).not.toContain("You're subscribed")
    expect(text).not.toContain('Upgrade to Pro')
    expect(initRevenueCat).toHaveBeenCalledWith('user-1')
    expect(getCustomerInfo).toHaveBeenCalled()
  })

  it('stays neutral when RevenueCat init throws', async () => {
    initRevenueCat.mockRejectedValue(new Error('init failed'))

    const ui = await AccountSettingsPage()
    render(ui)

    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain(UNKNOWN)
    })
    expect(screen.getByRole('link', { name: 'Check subscription' }).getAttribute('href')).toBe(
      '/paywall'
    )
    expect(bodyText()).not.toContain("You're subscribed")
    expect(bodyText()).not.toContain('Upgrade to Pro')
    expect(getCustomerInfo).not.toHaveBeenCalled()
  })

  it('stays neutral when getCustomerInfo throws', async () => {
    initRevenueCat.mockResolvedValue({ available: true })
    getCustomerInfo.mockRejectedValue(new Error('customer info failed'))

    const ui = await AccountSettingsPage()
    render(ui)

    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain(UNKNOWN)
    })
    expect(screen.getByRole('link', { name: 'Check subscription' }).getAttribute('href')).toBe(
      '/paywall'
    )
    expect(bodyText()).not.toContain("You're subscribed")
    expect(bodyText()).not.toContain('Upgrade to Pro')
    expect(initRevenueCat).toHaveBeenCalledWith('user-1')
    expect(getCustomerInfo).toHaveBeenCalled()
  })

  it('stays neutral for an empty user id even when init succeeds', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: '', email: 'owner@example.com' } },
      error: null,
    })
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
      expect(screen.getByRole('status').textContent).toContain(UNKNOWN)
    })
    expect(screen.getByRole('link', { name: 'Check subscription' }).getAttribute('href')).toBe(
      '/paywall'
    )
    expect(bodyText()).not.toContain("You're subscribed")
    expect(bodyText()).not.toContain('Upgrade to Pro')
    expect(initRevenueCat).toHaveBeenCalledWith('')
    expect(getCustomerInfo).not.toHaveBeenCalled()
  })
})
