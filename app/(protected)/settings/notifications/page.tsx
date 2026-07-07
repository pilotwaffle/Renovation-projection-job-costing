import { redirect } from 'next/navigation'
import Link from 'next/link'
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

        <div className="mt-8 border-t border-gray-200 pt-6 text-sm text-gray-500">
          <Link href="/settings/account" className="text-gray-500 underline hover:text-gray-700">
            Account settings &amp; delete account
          </Link>
        </div>
      </div>
    </div>
  )
}