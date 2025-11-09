'use client'

import Navigation from './Navigation'

interface DashboardLayoutProps {
  children: React.ReactNode
  user?: {
    email: string
  }
}

export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const handleLogout = async () => {
    // This will be handled by the server action in the parent component
    const form = document.createElement('form')
    const button = document.createElement('button')
    button.type = 'submit'
    button.formAction = '/api/auth/logout'
    form.appendChild(button)
    document.body.appendChild(form)
    form.submit()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} onLogout={handleLogout} />
      {children}
    </div>
  )
}