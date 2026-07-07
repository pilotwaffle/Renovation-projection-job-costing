import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navigation from '@/components/Navigation'
import DeleteAccountSection from './DeleteAccountSection'

export default async function AccountSettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userEmail={user.email} showLogout={true} />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
            <p className="mt-2 text-gray-600">
              Manage your account, including permanently deleting it.
            </p>
          </div>

          <div className="rounded-lg border border-red-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-red-700">Delete account</h2>
            <p className="mt-2 text-gray-700">
              Deleting your account is <strong>permanent and cannot be undone</strong>.
              This will immediately and permanently delete:
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-6 text-gray-700">
              <li>All of your jobs and their budgets</li>
              <li>All change orders and schedules</li>
              <li>All scope items and uploaded photos</li>
              <li>All budget templates</li>
              <li>All notification settings and history</li>
              <li>Your login and account information</li>
            </ul>
            <p className="mt-3 text-gray-700">
              There is no way to recover this data once deletion completes.
            </p>

            <DeleteAccountSection email={user.email ?? ''} />
          </div>
        </div>
      </div>
    </div>
  )
}
