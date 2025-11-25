import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NotificationSettings } from '@/components/notifications/NotificationSettings'

export default async function NotificationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
          <p className="mt-2 text-gray-600">
            Manage your email notifications and alert preferences
          </p>
        </div>

        <NotificationSettings userId={user.id} />
      </div>
    </div>
  )
}