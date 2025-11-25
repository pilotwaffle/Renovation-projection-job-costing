import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NotificationDashboard } from '@/components/notifications/NotificationDashboard'

export default async function NotificationDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Notification Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Monitor notification system performance and manage settings
          </p>
        </div>

        <NotificationDashboard userId={user.id} />
      </div>
    </div>
  )
}