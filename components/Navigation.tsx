'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/(protected)/dashboard/actions'

interface NavigationProps {
  userEmail?: string
  showLogout?: boolean
}

export default function Navigation({ userEmail, showLogout = true }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname?.startsWith(path)
  }

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/jobs', label: 'Jobs' },
    { href: '/templates', label: 'Templates' },
  ]

  return (
    <nav className="bg-white shadow">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          {/* Left side - Logo and desktop nav */}
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <Link href="/dashboard" className="flex items-center gap-3">
                <Image
                  src="/torq-console.svg"
                  alt="Torq Console"
                  width={40}
                  height={40}
                  className="h-10 w-10"
                />
                <h1 className="text-xl font-bold text-gray-900">Job Costing</h1>
              </Link>
            </div>
            {/* Desktop navigation */}
            <div className="hidden sm:ml-10 sm:flex sm:items-center sm:space-x-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 text-sm font-medium ${
                    isActive(link.href)
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right side - User info and logout (desktop) */}
          <div className="hidden sm:flex sm:items-center sm:space-x-4">
            {userEmail && (
              <span className="text-sm text-gray-700">{userEmail}</span>
            )}
            {showLogout && (
              <form>
                <button
                  formAction={logout}
                  className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
                >
                  Sign out
                </button>
              </form>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center rounded-md p-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 min-h-[44px] min-w-[44px]"
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle main menu"
            >
              <span className="sr-only">Open main menu</span>
              {/* Hamburger icon */}
              {!isMobileMenuOpen ? (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden">
          <div className="space-y-1 pb-3 pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`block px-4 py-3 text-base font-medium min-h-[44px] flex items-center ${
                  isActive(link.href)
                    ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
          {(userEmail || showLogout) && (
            <div className="border-t border-gray-200 pb-3 pt-4">
              {userEmail && (
                <div className="px-4 text-sm text-gray-700 mb-3">
                  {userEmail}
                </div>
              )}
              {showLogout && (
                <div className="px-4">
                  <form>
                    <button
                      formAction={logout}
                      className="w-full rounded-md bg-red-600 px-3 py-3 text-sm font-semibold text-white shadow-sm hover:bg-red-500 min-h-[44px]"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
