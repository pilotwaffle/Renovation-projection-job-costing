import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2.0.0'
import { EmailTemplates } from '../../lib/email-templates.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  user_id: string
  job_id?: string
  notification_type: string
  context_data: Record<string, any>
  priority?: number
  scheduled_at?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

    const { notification_queue_id }: { notification_queue_id: string } = await req.json()

    if (!notification_queue_id) {
      throw new Error('notification_queue_id is required')
    }

    // Fetch notification from queue
    const { data: notification, error: fetchError } = await supabaseClient
      .from('notification_queue')
      .select('*')
      .eq('id', notification_queue_id)
      .eq('status', 'pending')
      .single()

    if (fetchError || !notification) {
      throw new Error(`Notification not found or not pending: ${fetchError?.message}`)
    }

    // Update status to processing
    await supabaseClient
      .from('notification_queue')
      .update({
        status: 'processing',
        attempts: notification.attempts + 1,
        last_attempt_at: new Date().toISOString()
      })
      .eq('id', notification_queue_id)

    // Get user preferences
    const { data: preferences, error: prefError } = await supabaseClient
      .from('notification_preferences')
      .select('*')
      .eq('user_id', notification.user_id)
      .single()

    if (prefError || !preferences) {
      throw new Error(`User preferences not found: ${prefError?.message}`)
    }

    // Get job details if job_id exists
    let jobDetails = null
    if (notification.job_id) {
      const { data: job } = await supabaseClient
        .from('jobs')
        .select('name, client_name')
        .eq('id', notification.job_id)
        .single()

      jobDetails = job
    }

    // Prepare context data with job details
    const contextData = {
      ...notification.context_data,
      job_name: jobDetails?.name || 'Unknown Job',
      client_name: jobDetails?.client_name || null
    }

    // Generate email template
    let emailTemplate
    switch (notification.notification_type) {
      case 'variance_alert':
        emailTemplate = EmailTemplates.varianceAlert(contextData)
        break
      case 'milestone_alert':
        emailTemplate = EmailTemplates.milestoneAlert(contextData)
        break
      case 'daily_summary':
        emailTemplate = EmailTemplates.dailySummary(contextData)
        break
      case 'weekly_summary':
        emailTemplate = EmailTemplates.weeklySummary(contextData)
        break
      case 'change_order_created':
        emailTemplate = EmailTemplates.changeOrderCreated(contextData)
        break
      default:
        throw new Error(`Unknown notification type: ${notification.notification_type}`)
    }

    // Send email using Resend
    const emailData = {
      from: Deno.env.get('FROM_EMAIL') || 'notifications@renovation-job-costing.com',
      to: [preferences.email_address],
      subject: emailTemplate.subject,
      html: emailTemplate.htmlContent,
      text: emailTemplate.textContent
    }

    const { data: emailResult, error: emailError } = await resend.emails.send(emailData)

    if (emailError) {
      // Log failure
      await supabaseClient.from('notification_logs').insert({
        user_id: notification.user_id,
        job_id: notification.job_id,
        notification_type: notification.notification_type,
        email_address: preferences.email_address,
        subject: emailTemplate.subject,
        template_name: emailTemplate.name,
        status: 'failed',
        delivery_attempts: notification.attempts + 1,
        last_attempt_at: new Date().toISOString(),
        error_message: emailError.message,
        error_code: 'EMAIL_SEND_FAILED',
        context_data: contextData
      })

      // Update queue status
      const newStatus = notification.attempts + 1 >= notification.max_attempts ? 'failed' : 'pending'
      await supabaseClient
        .from('notification_queue')
        .update({
          status: newStatus,
          error_message: emailError.message
        })
        .eq('id', notification_queue_id)

      throw new Error(`Failed to send email: ${emailError.message}`)
    }

    // Log success
    await supabaseClient.from('notification_logs').insert({
      user_id: notification.user_id,
      job_id: notification.job_id,
      notification_type: notification.notification_type,
      email_address: preferences.email_address,
      subject: emailTemplate.subject,
      template_name: emailTemplate.name,
      status: 'sent',
      delivery_attempts: notification.attempts + 1,
      sent_at: new Date().toISOString(),
      context_data: contextData
    })

    // Update queue status to completed
    await supabaseClient
      .from('notification_queue')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', notification_queue_id)

    return new Response(
      JSON.stringify({
        success: true,
        emailId: emailResult.id,
        notificationId: notification_queue_id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in send-notification function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})