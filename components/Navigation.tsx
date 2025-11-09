'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

interface NavigationProps {
  user?: {
    email: string
  }
  onLogout?: () => void
}

export default function Navigation({ user, onLogout }: NavigationProps) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isActive = (path: string) => {
    if (!mounted) return false
    return pathname === path
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
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <Link href="/dashboard" className="flex items-center space-x-3">
                <img
                  src="/logo.png"
                  alt="Job Costing Logo"
                  className="h-8 w-auto"
                />
                <span className="text-xl font-bold text-gray-900">Job Costing</span>
              </Link>
            </div>
            <div className="ml-10 flex items-center space-x-4">
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
          <div className="flex items-center space-x-4">
            {user && (
              <span className="text-sm text-gray-700">{user.email}</span>
            )}
            {onLogout && (
              <form>
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
                >
                  Sign out
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}