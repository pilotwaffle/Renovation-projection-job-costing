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

    // Fetch pending notifications that are scheduled to be sent
    const { data: pendingNotifications, error: fetchError } = await supabaseClient
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('priority, created_at', { ascending: true })
      .limit(50) // Process up to 50 notifications at once

    if (fetchError) {
      throw new Error(`Failed to fetch pending notifications: ${fetchError.message}`)
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending notifications to process' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Trigger send-notification function for each pending notification
    const sendNotificationUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`
    const results = []

    for (const notification of pendingNotifications) {
      try {
        const response = await fetch(sendNotificationUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            notification_queue_id: notification.id
          })
        })

        const result = await response.json()

        results.push({
          notificationId: notification.id,
          success: response.ok,
          result: result
        })

        // Add small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`Failed to process notification ${notification.id}:`, error)
        results.push({
          notificationId: notification.id,
          success: false,
          error: error.message
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return new Response(
      JSON.stringify({
        processed: results.length,
        success: successCount,
        failed: failureCount,
        results: results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in process-queue function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})