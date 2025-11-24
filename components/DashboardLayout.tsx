'use client'

import Navigation from './Navigation'

interface DashboardLayoutProps {
  children: React.ReactNode
  user?: {
    email: string
  }
}

export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userEmail={user?.email} showLogout={true} />
      {children}
    </div>
  )
}