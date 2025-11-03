import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CreateJobForm from './CreateJobForm'
import type { BudgetTemplate } from '@/lib/types'

export default async function NewJobPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user's templates
  const { data: templates } = await supabase
    .from('budget_templates')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-10">
        <header>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">Create New Job</h1>
          </div>
        </header>
        <main>
          <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
            <CreateJobForm templates={(templates || []) as BudgetTemplate[]} />
          </div>
        </main>
      </div>
    </div>
  )
}
