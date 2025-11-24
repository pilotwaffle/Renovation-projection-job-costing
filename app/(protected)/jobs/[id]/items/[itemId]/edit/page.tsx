import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navigation from '@/components/Navigation'
import EditScopeItemForm from './EditScopeItemForm'

export default async function EditScopeItemPage({
  params
}: {
  params: Promise<{ id: string; itemId: string }>
}) {
  const { id: jobId, itemId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: item } = await supabase
    .from('scope_items')
    .select('*, budget_version:budget_versions(*, job:jobs(*))')
    .eq('id', itemId)
    .single()

  if (!item) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation userEmail={user.email} showLogout={true} />

      <div className="py-10">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Budget Item</h1>
          <p className="text-sm text-gray-700 mb-8">{item.description}</p>

          <EditScopeItemForm item={item} jobId={jobId} />
        </div>
      </div>
    </div>
  )
}
