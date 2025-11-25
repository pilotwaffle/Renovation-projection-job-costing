import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { notificationService } from '@/lib/notifications'
import { EmailTemplates } from '@/lib/email-templates'
import type { NotificationPreferences, NotificationType } from '@/lib/types'

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  upsert: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  single: vi.fn(() => mockSupabase),
  order: vi.fn(() => mockSupabase),
  limit: vi.fn(() => mockSupabase),
  range: vi.fn(() => mockSupabase),
  rpc: vi.fn(() => mockSupabase),
  gte: vi.fn(() => mockSupabase),
  lte: vi.fn(() => mockSupabase),
  lt: vi.fn(() => mockSupabase),
  gt: vi.fn(() => mockSupabase),
  in: vi.fn(() => mockSupabase)
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase
}))

describe('NotificationService', () => {
  const userId = 'test-user-id'
  const jobId = 'test-job-id'
  const budgetVersionId = 'test-budget-version-id'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Preferences Management', () => {
    it('should get user preferences', async () => {
      const mockPreferences: NotificationPreferences = {
        id: 'pref-id',
        user_id: userId,
        variance_alerts_enabled: true,
        variance_threshold_percentage: 10,
        change_order_notifications_enabled: true,
        daily_summary_enabled: false,
        weekly_summary_enabled: true,
        milestone_alerts_enabled: true,
        milestone_thresholds: [50, 75, 90],
        email_address: 'test@example.com',
        timezone: 'UTC',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }

      mockSupabase.single.mockResolvedValue({
        data: mockPreferences,
        error: null
      })

      const result = await notificationService.getPreferences(userId)

      expect(result).toEqual(mockPreferences)
      expect(mockSupabase.from).toHaveBeenCalledWith('notification_preferences')
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', userId)
      expect(mockSupabase.single).toHaveBeenCalled()
    })

    it('should handle missing preferences gracefully', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      })

      const result = await notificationService.getPreferences(userId)

      expect(result).toBeNull()
    })

    it('should update preferences', async () => {
      const updateData = {
        variance_threshold_percentage: 15,
        daily_summary_enabled: true
      }

      const updatedPreferences: NotificationPreferences = {
        id: 'pref-id',
        user_id: userId,
        variance_alerts_enabled: true,
        variance_threshold_percentage: 15,
        change_order_notifications_enabled: true,
        daily_summary_enabled: true,
        weekly_summary_enabled: true,
        milestone_alerts_enabled: true,
        milestone_thresholds: [50, 75, 90],
        email_address: 'test@example.com',
        timezone: 'UTC',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }

      mockSupabase.single.mockResolvedValue({
        data: updatedPreferences,
        error: null
      })

      const result = await notificationService.updatePreferences(userId, updateData)

      expect(result).toEqual(updatedPreferences)
      expect(mockSupabase.from).toHaveBeenCalledWith('notification_preferences')
      expect(mockSupabase.upsert).toHaveBeenCalledWith({
        user_id: userId,
        ...updateData,
        updated_at: expect.any(String)
      })
    })

    it('should create default preferences', async () => {
      const emailAddress = 'test@example.com'
      const mockPreferences: NotificationPreferences = {
        id: 'pref-id',
        user_id: userId,
        variance_alerts_enabled: true,
        variance_threshold_percentage: 10,
        change_order_notifications_enabled: true,
        daily_summary_enabled: false,
        weekly_summary_enabled: true,
        milestone_alerts_enabled: true,
        milestone_thresholds: [50, 75, 90],
        email_address: emailAddress,
        timezone: 'UTC',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      }

      // Mock the RPC call to get_or_create_notification_preferences
      mockSupabase.rpc.mockResolvedValue({
        data: 'pref-id',
        error: null
      })

      // Mock the getPreferences call inside createDefaultPreferences
      mockSupabase.single.mockResolvedValue({
        data: mockPreferences,
        error: null
      })

      const result = await notificationService.createDefaultPreferences(userId, emailAddress)

      expect(result).toEqual(mockPreferences)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_or_create_notification_preferences', {
        p_user_id: userId,
        p_email_address: emailAddress
      })
    })
  })

  describe('Notification Queue', () => {
    it('should queue a notification', async () => {
      const notificationType: NotificationType = 'variance_alert'
      const contextData = {
        variance_percentage: 15.5,
        total_estimated: 10000,
        total_actual: 11550
      }

      const notificationId = 'notification-id'

      mockSupabase.rpc.mockResolvedValue({
        data: notificationId,
        error: null
      })

      const result = await notificationService.queueNotification({
        user_id: userId,
        job_id: jobId,
        notification_type: notificationType,
        context_data: contextData,
        priority: 2
      })

      expect(result).toBe(notificationId)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('queue_notification', {
        p_user_id: userId,
        p_job_id: jobId,
        p_notification_type: notificationType,
        p_context_data: contextData,
        p_priority: 2,
        p_scheduled_at: expect.any(String)
      })
    })

    it('should trigger variance check', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: null
      })

      await notificationService.triggerVarianceCheck(jobId, budgetVersionId)

      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_variance_alerts', {
        p_job_id: jobId,
        p_budget_version_id: budgetVersionId
      })
    })

    it('should queue change order notification', async () => {
      const changeOrderDetails = {
        id: 'co-001',
        description: 'Updated kitchen cabinets',
        cost_impact: 2500
      }

      const mockPreferences = {
        change_order_notifications_enabled: true,
        email_address: 'test@example.com'
      }

      const mockJob = {
        name: 'Test Job',
        client_name: 'Test Client'
      }

      // Mock getPreferences
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockPreferences, error: null })

      // Mock job query
      mockSupabase.single
        .mockResolvedValueOnce({ data: mockJob, error: null })

      // Mock queue notification RPC
      mockSupabase.rpc.mockResolvedValue({
        data: 'notification-id',
        error: null
      })

      await notificationService.queueChangeOrderNotification(userId, jobId, changeOrderDetails)

      expect(mockSupabase.from).toHaveBeenCalledWith('notification_preferences')
      expect(mockSupabase.from).toHaveBeenCalledWith('jobs')
      expect(mockSupabase.rpc).toHaveBeenCalledWith('queue_notification', {
        p_user_id: userId,
        p_job_id: jobId,
        p_notification_type: 'change_order_created',
        p_context_data: {
          job_name: 'Test Job',
          client_name: 'Test Client',
          change_order_details: changeOrderDetails
        },
        p_priority: 2
      })
    })
  })

  describe('Notification History', () => {
    it('should get notification history', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          user_id: userId,
          job_id: jobId,
          notification_type: 'variance_alert' as NotificationType,
          email_address: 'test@example.com',
          subject: 'Budget Alert: Test Job',
          template_name: 'variance-alert',
          status: 'sent',
          delivery_attempts: 1,
          sent_at: '2023-01-01T12:00:00Z',
          context_data: { variance_percentage: 15.5 },
          created_at: '2023-01-01T12:00:00Z'
        }
      ]

      mockSupabase.select.mockReturnThis()
      mockSupabase.eq.mockReturnThis()
      mockSupabase.order.mockReturnThis()
      mockSupabase.range.mockReturnThis()
      mockSupabase.single.mockResolvedValue({
        data: { count: 1 },
        error: null
      })

      // Mock the actual data return
      mockSupabake = {
        ...mockSupabase,
        data: mockLogs,
        error: null,
        count: 1
      }

      const result = await notificationService.getNotificationHistory(userId, 20, 0)

      expect(result.logs).toEqual(mockLogs)
      expect(result.total).toBe(1)
    })

    it('should get notification stats', async () => {
      const mockStats = {
        total_sent: 10,
        total_failed: 2,
        total_pending: 1,
        recent_notifications: [],
        notification_types: {
          variance_alert: 5,
          daily_summary: 3
        }
      }

      // Mock all the separate queries for stats
      mockSupabase.select.mockResolvedValue({
        data: [
          { status: 'sent' },
          { status: 'sent' },
          { status: 'failed' }
        ],
        error: null
      })

      const result = await notificationService.getNotificationStats(userId)

      expect(result).toHaveProperty('total_sent')
      expect(result).toHaveProperty('total_failed')
      expect(result).toHaveProperty('total_pending')
      expect(result).toHaveProperty('recent_notifications')
      expect(result).toHaveProperty('notification_types')
    })
  })
})

describe('EmailTemplates', () => {
  describe('varianceAlert', () => {
    it('should generate variance alert template', () => {
      const contextData = {
        variance_percentage: 15.5,
        total_estimated: 10000,
        total_actual: 11550,
        total_variance: 1550,
        threshold: 10,
        job_name: 'Test Job',
        client_name: 'Test Client'
      }

      const template = EmailTemplates.varianceAlert(contextData)

      expect(template.name).toBe('variance-alert')
      expect(template.subject).toContain('15.5% over budget')
      expect(template.htmlContent).toContain('15.5%')
      expect(template.htmlContent).toContain('$10,000.00')
      expect(template.htmlContent).toContain('$11,550.00')
      expect(template.textContent).toContain('15.5%')
    })

    it('should handle under budget scenario', () => {
      const contextData = {
        variance_percentage: -5.2,
        total_estimated: 10000,
        total_actual: 9480,
        total_variance: -520,
        threshold: 10,
        job_name: 'Test Job'
      }

      const template = EmailTemplates.varianceAlert(contextData)

      expect(template.subject).toContain('5.2% under budget')
      expect(template.htmlContent).toContain('under budget')
    })
  })

  describe('milestoneAlert', () => {
    it('should generate milestone alert template', () => {
      const contextData = {
        milestone_percentage: 50,
        variance_percentage: 52.3,
        total_estimated: 10000,
        total_actual: 15230,
        job_name: 'Test Job'
      }

      const template = EmailTemplates.milestoneAlert(contextData)

      expect(template.name).toBe('milestone-alert')
      expect(template.subject).toContain('50% variance')
      expect(template.htmlContent).toContain('50%')
      expect(template.htmlContent).toContain('52.3%')
    })
  })

  describe('dailySummary', () => {
    it('should generate daily summary template', () => {
      const contextData = {
        job_name: 'Test Job',
        summary_data: {
          total_budget: 10000,
          total_spent: 8500,
          variance_percentage: 15.0,
          items_updated: 3,
          activities: [
            { type: 'Scope Item Updated', description: 'Kitchen cabinets', time: '2:30 PM' }
          ]
        }
      }

      const template = EmailTemplates.dailySummary(contextData)

      expect(template.name).toBe('daily-summary')
      expect(template.subject).toContain('Daily Summary: Test Job')
      expect(template.htmlContent).toContain('$10,000.00')
      expect(template.htmlContent).toContain('$8,500.00')
      expect(template.htmlContent).toContain('15.0%')
    })
  })

  describe('changeOrderCreated', () => {
    it('should generate change order template', () => {
      const contextData = {
        job_name: 'Test Job',
        client_name: 'Test Client',
        change_order_details: {
          id: 'CO-001',
          description: 'Updated kitchen cabinets',
          impact_type: 'positive',
          impact_description: 'Will improve kitchen functionality',
          cost_impact: 2500
        }
      }

      const template = EmailTemplates.changeOrderCreated(contextData)

      expect(template.name).toBe('change-order-created')
      expect(template.subject).toContain('Change Order Created: Test Job')
      expect(template.htmlContent).toContain('CO-001')
      expect(template.htmlContent).toContain('Updated kitchen cabinets')
      expect(template.htmlContent).toContain('$2,500.00')
    })
  })
})