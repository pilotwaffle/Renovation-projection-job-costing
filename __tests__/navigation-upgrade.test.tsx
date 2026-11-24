import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import type { ReactNode } from 'react'

const pathState = vi.hoisted(() => ({ current: '/dashboard' }))

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
  usePathname: () => pathState.current,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock('next/image', () => ({
  default: ({ alt }: { alt?: string }) => (
    // The logo is decorative in these assertions; textContent comes from the heading.
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} />
  ),
}))

vi.mock('@/app/(protected)/dashboard/actions', () => ({
  logout: vi.fn(),
}))

import Navigation from '../components/Navigation'

function classTokens(element: HTMLElement): string[] {
  return element.className.split(/\s+/).filter(Boolean)
}

function hasClass(element: HTMLElement, name: string): boolean {
  return classTokens(element).includes(name)
}

beforeEach(() => {
  pathState.current = '/dashboard'
})

afterEach(() => {
  cleanup()
})

describe('Navigation upgrade link', () => {
  it('renders an Upgrade link to /paywall after Settings', () => {
    render(<Navigation userEmail="owner@example.com" />)

    const upgrade = screen.getByRole('link', { name: 'Upgrade' })
    expect(upgrade.getAttribute('href')).toBe('/paywall')

    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.textContent?.trim())).toEqual([
      'RenoMargin',
      'Dashboard',
      'Jobs',
      'Templates',
      'Settings',
      'Upgrade',
    ])
    expect(links.slice(1).map((link) => link.getAttribute('href'))).toEqual([
      '/dashboard',
      '/jobs',
      '/templates',
      '/settings/account',
      '/paywall',
    ])
  })

  it('keeps isActive as a pathname prefix match', () => {
    pathState.current = '/settings/account'
    const view = render(<Navigation userEmail="owner@example.com" />)

    const settings = screen.getByRole('link', { name: 'Settings' })
    const upgrade = screen.getByRole('link', { name: 'Upgrade' })
    // Inactive links use hover:text-blue-600, so match the class token, not the raw string.
    expect(hasClass(settings, 'text-blue-600')).toBe(true)
    expect(hasClass(settings, 'border-b-2')).toBe(true)
    expect(hasClass(upgrade, 'text-blue-600')).toBe(false)
    expect(hasClass(upgrade, 'border-b-2')).toBe(false)

    pathState.current = '/paywall'
    view.rerender(<Navigation userEmail="owner@example.com" />)

    const upgradeActive = screen.getByRole('link', { name: 'Upgrade' })
    expect(hasClass(upgradeActive, 'text-blue-600')).toBe(true)
    expect(hasClass(upgradeActive, 'border-b-2')).toBe(true)
    for (const name of ['Dashboard', 'Jobs', 'Templates', 'Settings']) {
      const link = screen.getByRole('link', { name })
      expect(hasClass(link, 'text-blue-600')).toBe(false)
      expect(hasClass(link, 'border-b-2')).toBe(false)
    }
  })

  it('shows the Upgrade link in the mobile menu', () => {
    render(<Navigation userEmail="owner@example.com" />)
    fireEvent.click(screen.getByRole('button', { name: 'Toggle main menu' }))
    const upgrades = screen.getAllByRole('link', { name: 'Upgrade' })
    expect(upgrades).toHaveLength(2)
    for (const link of upgrades) {
      expect(link.getAttribute('href')).toBe('/paywall')
    }
  })
})
