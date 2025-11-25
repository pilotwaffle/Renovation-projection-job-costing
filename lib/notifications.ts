import { createClient } from './supabase/client'
import { logger } from './logger'
import type {
  NotificationPreferences,
  NotificationSettingsForm,
  NotificationQueueParams,
  NotificationType,
  NotificationLog,
  NotificationQueue
} from './types'

class NotificationService {
  private supabase

  constructor() {
    this.supabase = createClient()
  }

  // Preferences Management
  async getPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      logger.debug('Fetching notification preferences for user', { userId })

      const { data, error } = await this.supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        logger.error('Error fetching notification preferences', { userId, error })
        throw error
      }

      logger.debug('Successfully fetched notification preferences', { userId, hasPreferences: !!data })
      return data
    } catch (error) {
      logger.error('Error fetching notification preferences', { userId, error })
      throw error
    }
  }

  async updatePreferences(userId: string, preferences: Partial<NotificationSettingsForm>): Promise<NotificationPreferences> {
    try {
      logger.info('Updating notification preferences', { userId, preferences })

      const { data, error } = await this.supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        logger.error('Error updating notification preferences', { userId, preferences, error })
        throw error
      }

      logger.info('Successfully updated notification preferences', { userId, preferenceId: data.id })
      return data
    } catch (error) {
      logger.error('Error updating notification preferences', { userId, preferences, error })
      throw error
    }
  }

  async createDefaultPreferences(userId: string, emailAddress: string): Promise<NotificationPreferences> {
    try {
      logger.info('Creating default notification preferences', { userId, emailAddress })

      const { data, error } = await this.supabase
        .rpc('get_or_create_notification_preferences', {
          p_user_id: userId,
          p_email_address: emailAddress
        })
        .select()

      if (error) {
        logger.error('Error creating default preferences', { userId, emailAddress, error })
        throw error
      }

      // Fetch the complete preferences
      const preferences = await this.getPreferences(userId)
      logger.info('Successfully created default preferences', { userId })
      return preferences!
    } catch (error) {
      logger.error('Error creating default preferences', { userId, emailAddress, error })
      throw error
    }
  }

  // Notification Queue Management
  async queueNotification(params: NotificationQueueParams): Promise<string> {
    try {
      logger.info('Queuing notification', params)

      const { data, error } = await this.supabase
        .rpc('queue_notification', {
          p_user_id: params.user_id,
          p_job_id: params.job_id,
          p_notification_type: params.notification_type,
          p_context_data: params.context_data,
          p_priority: params.priority || 3,
          p_scheduled_at: params.scheduled_at || new Date().toISOString()
        })

      if (error) {
        logger.error('Error queuing notification', params, error)
        throw error
      }

      logger.info('Successfully queued notification', { notificationId: data, ...params })
      return data
    } catch (error) {
      logger.error('Error queuing notification', params, error)
      throw error
    }
  }

  // Trigger variance alerts for a budget
  async triggerVarianceCheck(jobId: string, budgetVersionId: string): Promise<void> {
    try {
      logger.info('Triggering variance check', { jobId, budgetVersionId })

      const { error } = await this.supabase
        .rpc('check_variance_alerts', {
          p_job_id: jobId,
          p_budget_version_id: budgetVersionId
        })

      if (error) {
        logger.error('Error triggering variance check', { jobId, budgetVersionId, error })
        throw error
      }

      logger.info('Successfully triggered variance check', { jobId, budgetVersionId })
    } catch (error) {
      logger.error('Error triggering variance check', { jobId, budgetVersionId, error })
      throw error
    }
  }

  // Notification History
  async getNotificationHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0,
    jobId?: string
  ): Promise<{ logs: NotificationLog[], total: number }> {
    try {
      logger.debug('Fetching notification history', { userId, limit, offset, jobId })

      let query = this.supabase
        .from('notification_logs')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (jobId) {
        query = query.eq('job_id', jobId)
      }

      const { data, error, count } = await query

      if (error) {
        logger.error('Error fetching notification history', { userId, limit, offset, jobId, error })
        throw error
      }

      const result = {
        logs: data || [],
        total: count || 0
      }

      logger.debug('Successfully fetched notification history', { userId, total: result.total })
      return result
    } catch (error) {
      logger.error('Error fetching notification history', { userId, limit, offset, jobId, error })
      throw error
    }
  }

  async getNotificationStats(userId: string): Promise<{
    total_sent: number
    total_failed: number
    total_pending: number
    recent_notifications: NotificationLog[]
    notification_types: Record<string, number>
  }> {
    try {
      logger.debug('Fetching notification stats', { userId })

      // Get counts by status
      const { data: statusCounts, error: statusError } = await this.supabase
        .from('notification_logs')
        .select('status')
        .eq('user_id', userId)

      if (statusError) {
        logger.error('Error fetching status counts', { userId, error: statusError })
        throw statusError
      }

      // Get counts by type
      const { data: typeCounts, error: typeError } = await this.supabase
        .from('notification_logs')
        .select('notification_type')
        .eq('user_id', userId)

      if (typeError) {
        logger.error('Error fetching type counts', { userId, error: typeError })
        throw typeError
      }

      // Get recent notifications
      const { data: recentNotifications, error: recentError } = await this.supabase
        .from('notification_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (recentError) {
        logger.error('Error fetching recent notifications', { userId, error: recentError })
        throw recentError
      }

      // Get pending queue count
      const { data: pendingNotifications, error: pendingError } = await this.supabase
        .from('notification_queue')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'pending')

      if (pendingError) {
        logger.error('Error fetching pending notifications', { userId, error: pendingError })
        throw pendingError
      }

      // Calculate stats
      const statusGroups = statusCounts?.reduce((acc, log) => {
        acc[log.status] = (acc[log.status] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const typeGroups = typeCounts?.reduce((acc, log) => {
        acc[log.notification_type] = (acc[log.notification_type] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const stats = {
        total_sent: statusGroups['sent'] || 0,
        total_failed: statusGroups['failed'] || 0,
        total_pending: pendingNotifications?.length || 0,
        recent_notifications: recentNotifications || [],
        notification_types: typeGroups
      }

      logger.debug('Successfully fetched notification stats', { userId, stats })
      return stats
    } catch (error) {
      logger.error('Error fetching notification stats', { userId, error })
      throw error
    }
  }

  // Batch Operations
  async queueChangeOrderNotification(
    userId: string,
    jobId: string,
    changeOrderDetails: Record<string, any>,
    type: 'created' | 'updated' = 'created'
  ): Promise<void> {
    try {
      logger.info('Queuing change order notification', { userId, jobId, changeOrderDetails, type })

      const preferences = await this.getPreferences(userId)

      if (!preferences?.change_order_notifications_enabled) {
        logger.info('Change order notifications disabled, skipping', { userId })
        return // User has disabled change order notifications
      }

      // Get job details
      const { data: job } = await this.supabase
        .from('jobs')
        .select('name, client_name')
        .eq('id', jobId)
        .single()

      await this.queueNotification({
        user_id: userId,
        job_id: jobId,
        notification_type: `change_order_${type}` as NotificationType,
        context_data: {
          job_name: job?.name || 'Unknown Job',
          client_name: job?.client_name || null,
          change_order_details: changeOrderDetails
        },
        priority: 2 // High priority
      })

      logger.info('Successfully queued change order notification', { userId, jobId, type })
    } catch (error) {
      logger.error('Error queuing change order notification', { userId, jobId, changeOrderDetails, type, error })
      throw error
    }
  }

  // Test notification
  async sendTestNotification(userId: string, type: NotificationType): Promise<void> {
    try {
      logger.info('Sending test notification', { userId, type })

      const preferences = await this.getPreferences(userId)
      if (!preferences) {
        throw new Error('User preferences not found')
      }

      // Get a job for context (if available)
      const { data: job } = await this.supabase
        .from('jobs')
        .select('id, name, client_name')
        .eq('user_id', userId)
        .limit(1)
        .single()

      const contextData = {
        job_name: job?.name || 'Test Job',
        client_name: job?.client_name || null,
        // Add test data based on notification type
        ...(type === 'variance_alert' && {
          variance_percentage: 15.5,
          total_estimated: 10000,
          total_actual: 11550,
          total_variance: 1550,
          threshold: 10
        }),
        ...(type === 'milestone_alert' && {
          milestone_percentage: 50,
          variance_percentage: 52.3,
          total_estimated: 10000,
          total_actual: 15230
        }),
        ...(type === 'daily_summary' && {
          summary_data: {
            total_budget: 10000,
            total_spent: 8500,
            variance_percentage: 15.0,
            items_updated: 3,
            activities: [
              { type: 'Scope Item Updated', description: 'Kitchen cabinets updated', time: '2:30 PM' },
              { type: 'Scope Item Updated', description: 'Bathroom fixtures added', time: '1:15 PM' }
            ]
          }
        })
      }

      await this.queueNotification({
        user_id: userId,
        job_id: job?.id,
        notification_type: type,
        context_data,
        priority: 1 // Test notifications get highest priority
      })

      logger.info('Successfully sent test notification', { userId, type })
    } catch (error) {
      logger.error('Error sending test notification', { userId, type, error })
      throw error
    }
  }
}

export const notificationService = new NotificationService()
export default NotificationService