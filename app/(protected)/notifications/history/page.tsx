import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NotificationHistory } from '@/components/notifications/NotificationHistory'

export default async function NotificationHistoryPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Notification History</h1>
          <p className="mt-2 text-gray-600">
            View your email notification history and delivery status
          </p>
        </div>

        <NotificationHistory userId={user.id} />
      </div>
    </div>
  )
}