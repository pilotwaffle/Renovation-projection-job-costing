import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import type { ReactNode } from 'react'

const { getUser, initRevenueCat, rcLogIn, getCustomerInfo, getOfferings, restorePurchases } =
  vi.hoisted(() => ({
    getUser: vi.fn(),
    initRevenueCat: vi.fn(),
    rcLogIn: vi.fn(),
    getCustomerInfo: vi.fn(),
    getOfferings: vi.fn(),
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
  initRevenueCat,
  rcLogIn,
  getCustomerInfo,
  getOfferings,
  restorePurchases,
  isNativePlatform: () => true,
  hasPublicKey: () => true,
}))

import Diagnostics from '../app/dev/revenuecat/Diagnostics'

function initializeButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Initialize RevenueCat' }) as HTMLButtonElement
}

beforeEach(() => {
  vi.clearAllMocks()
  getUser.mockReset()
  initRevenueCat.mockReset()
  rcLogIn.mockReset()
  getCustomerInfo.mockReset()
  getOfferings.mockReset()
  restorePurchases.mockReset()
})

afterEach(() => {
  cleanup()
})

describe('RevenueCat diagnostics', () => {
  it('shows a sign-in link and does not configure when signed out', async () => {
    getUser.mockResolvedValue({ data: { user: null } })
    render(<Diagnostics />)

    const link = await screen.findByRole('link', { name: 'Sign in' })
    expect(link.getAttribute('href')).toBe('/login')
    expect(document.body.textContent).toContain('to use RevenueCat diagnostics.')
    expect(initializeButton().disabled).toBe(true)
    expect(initRevenueCat).not.toHaveBeenCalled()

    fireEvent.click(initializeButton())
    expect(initRevenueCat).not.toHaveBeenCalled()
  })

  it('shows a sign-in link when getUser rejects and does not configure', async () => {
    getUser.mockRejectedValue(new Error('network'))
    render(<Diagnostics />)

    const link = await screen.findByRole('link', { name: 'Sign in' })
    expect(link.getAttribute('href')).toBe('/login')
    expect(initRevenueCat).not.toHaveBeenCalled()
  })

  it('initializes with the Supabase user id and then enables the other actions', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    initRevenueCat.mockResolvedValue({ available: true, appUserId: 'user-1' })
    render(<Diagnostics />)

    await waitFor(() => {
      expect(initializeButton().disabled).toBe(false)
    })

    expect((screen.getByRole('button', { name: 'Get CustomerInfo' }) as HTMLButtonElement).disabled).toBe(
      true
    )
    expect((screen.getByRole('button', { name: 'Get Offerings' }) as HTMLButtonElement).disabled).toBe(
      true
    )
    expect(
      (screen.getByRole('button', { name: 'Restore Purchases' }) as HTMLButtonElement).disabled
    ).toBe(true)
    expect(
      (screen.getByRole('button', { name: 'Log in (Supabase uid)' }) as HTMLButtonElement).disabled
    ).toBe(true)
    expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull()
    expect(initRevenueCat).not.toHaveBeenCalled()

    fireEvent.click(initializeButton())

    await waitFor(() => {
      expect(initRevenueCat).toHaveBeenCalledTimes(1)
    })
    expect(initRevenueCat).toHaveBeenCalledWith('user-1')
    expect(rcLogIn).not.toHaveBeenCalled()

    await waitFor(() => {
      expect(
        (screen.getByRole('button', { name: 'Get CustomerInfo' }) as HTMLButtonElement).disabled
      ).toBe(false)
    })
    expect((screen.getByRole('button', { name: 'Get Offerings' }) as HTMLButtonElement).disabled).toBe(
      false
    )
    expect(
      (screen.getByRole('button', { name: 'Restore Purchases' }) as HTMLButtonElement).disabled
    ).toBe(false)
    expect(
      (screen.getByRole('button', { name: 'Log in (Supabase uid)' }) as HTMLButtonElement).disabled
    ).toBe(false)
  })
})
