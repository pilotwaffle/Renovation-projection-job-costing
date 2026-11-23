import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'

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

vi.mock('@/components/Navigation', () => ({
  default: () => <nav>Navigation</nav>,
}))

vi.mock('../app/(protected)/settings/account/DeleteAccountSection', () => ({
  default: () => <div>Delete account form</div>,
}))

import AccountSettingsPage from '../app/(protected)/settings/account/page'

describe('Account settings subscription', () => {
  it('renders a Subscription card above Delete account with an Upgrade to Pro link', async () => {
    const ui = await AccountSettingsPage()
    render(ui)

    const subscription = screen.getByRole('heading', { name: 'Subscription' })
    const deleteAccount = screen.getByRole('heading', { name: 'Delete account' })
    expect(
      subscription.compareDocumentPosition(deleteAccount) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()

    expect(screen.getByRole('link', { name: 'Upgrade to Pro' }).getAttribute('href')).toBe(
      '/paywall'
    )

    const text = document.body.textContent ?? ''
    expect(text).toContain(
      'Manage your subscription and account, including permanently deleting it.'
    )
    expect(text).toContain('RenoMargin Pro is the paid plan for this account.')
  })
})
