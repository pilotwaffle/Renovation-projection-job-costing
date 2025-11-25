import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { summary_type }: { summary_type: 'daily' | 'weekly' } = await req.json()

    if (!summary_type || !['daily', 'weekly'].includes(summary_type)) {
      throw new Error('Valid summary_type (daily or weekly) is required')
    }

    // Get users who have enabled summary notifications
    const { data: users, error: usersError } = await supabaseClient
      .from('notification_preferences')
      .select(`
        user_id,
        email_address,
        timezone,
        ${summary_type === 'daily' ? 'daily_summary_enabled' : 'weekly_summary_enabled'} as enabled
      `)
      .eq(`${summary_type === 'daily' ? 'daily_summary_enabled' : 'weekly_summary_enabled'}`, true)

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`)
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ message: `No users have ${summary_type} summaries enabled` }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    const scheduledNotifications = []

    for (const user of users) {
      // Get active jobs for this user
      const { data: jobs, error: jobsError } = await supabaseClient
        .from('jobs')
        .select('id, name, client_name')
        .eq('user_id', user.user_id)
        .eq('status', 'active')

      if (jobsError) {
        console.error(`Failed to fetch jobs for user ${user.user_id}:`, jobsError)
        continue
      }

      if (!jobs || jobs.length === 0) {
        continue
      }

      // For each job, generate and schedule summary notification
      for (const job of jobs) {
        const summaryData = await generateJobSummary(supabaseClient, job.id, summary_type)

        // Queue the summary notification
        const { data: queuedNotification, error: queueError } = await supabaseClient
          .rpc('queue_notification', {
            p_user_id: user.user_id,
            p_job_id: job.id,
            p_notification_type: `${summary_type}_summary`,
            p_context_data: {
              job_name: job.name,
              client_name: job.client_name,
              summary_data: summaryData
            },
            p_priority: 3 // Medium priority
          })

        if (queueError) {
          console.error(`Failed to queue summary for job ${job.id}:`, queueError)
        } else {
          scheduledNotifications.push({
            userId: user.user_id,
            jobId: job.id,
            notificationId: queuedNotification
          })
        }
      }
    }

    return new Response(
      JSON.stringify({
        summary_type,
        users_processed: users.length,
        notifications_scheduled: scheduledNotifications.length,
        notifications: scheduledNotifications
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in schedule-summary function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

async function generateJobSummary(supabaseClient: any, jobId: string, summaryType: 'daily' | 'weekly') {
  const now = new Date()
  const startDate = summaryType === 'daily'
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
    : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Get the latest budget version
  const { data: budgetVersion } = await supabaseClient
    .from('budget_versions')
    .select('id')
    .eq('job_id', jobId)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (!budgetVersion) {
    return null
  }

  // Get budget totals
  const { data: budgetTotals } = await supabaseClient
    .rpc('calculate_budget_totals', { budget_version_uuid: budgetVersion.id })
    .single()

  // Get scope items with categories
  const { data: scopeItems } = await supabaseClient
    .from('scope_items')
    .select(`
      *,
      categories (
        id,
        name,
        color
      )
    `)
    .eq('budget_version_id', budgetVersion.id)

  // Calculate summary data
  const totalBudget = budgetTotals?.total_estimated || 0
  const totalSpent = budgetTotals?.total_actual || 0
  const variancePercentage = budgetTotals?.variance_percentage || 0

  // Get recent activity
  const { data: recentActivity } = await supabaseClient
    .from('scope_items')
    .select('description, updated_at')
    .eq('budget_version_id', budgetVersion.id)
    .gte('updated_at', startDate.toISOString())
    .order('updated_at', { ascending: false })

  // Calculate category breakdown
  const categoriesWithSpending = scopeItems?.reduce((acc: any, item: any) => {
    const categoryName = item.categories?.name || 'Uncategorized'
    const categoryColor = item.categories?.color || '#999999'

    if (!acc[categoryName]) {
      acc[categoryName] = {
        name: categoryName,
        color: categoryColor,
        spent: 0,
        budget: 0,
        completed: 0
      }
    }

    const itemTotal = item.estimated_material_cost + (item.estimated_labor_hours * item.estimated_labor_rate)
    const actualTotal = item.actual_material_cost + (item.actual_labor_hours * item.estimated_labor_rate)

    acc[categoryName].spent += actualTotal
    acc[categoryName].budget += itemTotal
    if (item.is_completed) {
      acc[categoryName].completed += 1
    }

    return acc
  }, {}) || {}

  const categories = Object.values(categoriesWithSpending)

  const completedItems = scopeItems?.filter(item => item.is_completed).length || 0
  const totalItems = scopeItems?.length || 0
  const completionPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0

  // Calculate week's spending if weekly summary
  let weekSpent = 0
  if (summaryType === 'weekly') {
    scopeItems?.forEach((item: any) => {
      if (new Date(item.updated_at) >= startDate) {
        weekSpent += item.actual_material_cost + (item.actual_labor_hours * item.estimated_labor_rate)
      }
    })
  }

  return {
    total_budget: totalBudget,
    total_spent: totalSpent,
    variance_percentage: variancePercentage,
    items_updated: recentActivity?.length || 0,
    activities: recentActivity?.map((item: any) => ({
      type: 'Scope Item Updated',
      description: item.description,
      time: new Date(item.updated_at).toLocaleTimeString()
    })) || [],
    categories: categories,
    completion_percentage: completionPercentage,
    items_completed: completedItems,
    remaining_items: totalItems - completedItems,
    week_spent: weekSpent
  }
}