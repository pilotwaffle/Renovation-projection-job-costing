'use client'

import { useState, useEffect } from 'react'
import { notificationService } from '@/lib/notifications'
import type { NotificationLog } from '@/lib/types'

interface NotificationStats {
  total_sent: number
  total_failed: number
  total_pending: number
  recent_notifications: NotificationLog[]
  notification_types: Record<string, number>
}

interface NotificationDashboardProps {
  userId: string
}

export function NotificationDashboard({ userId }: NotificationDashboardProps) {
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
  }, [userId])

  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const notificationStats = await notificationService.getNotificationStats(userId)
      setStats(notificationStats)
    } catch (err) {
      setError('Failed to load notification statistics')
      console.error('Error loading notification stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">{error}</div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const totalNotifications = stats.total_sent + stats.total_failed + stats.total_pending
  const successRate = totalNotifications > 0 ? (stats.total_sent / totalNotifications) * 100 : 0

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'variance_alert':
        return 'Variance Alerts'
      case 'milestone_alert':
        return 'Milestone Alerts'
      case 'daily_summary':
        return 'Daily Summaries'
      case 'weekly_summary':
        return 'Weekly Summaries'
      case 'change_order_created':
        return 'Change Orders'
      case 'change_order_updated':
        return 'Change Order Updates'
      case 'budget_exceeded':
        return 'Budget Exceeded'
      default:
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }

  const getStatusColor = (value: number, total: number) => {
    const percentage = total > 0 ? (value / total) * 100 : 0
    if (percentage > 80) return 'text-green-600'
    if (percentage > 60) return 'text-yellow-600'
    if (percentage > 40) return 'text-orange-600'
    return 'text-red-600'
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Notification Dashboard</h1>
        <p className="mt-1 text-gray-600">
          Monitor your email notifications and delivery status
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sent</p>
              <p className={`text-3xl font-bold ${getStatusColor(stats.total_sent, totalNotifications)}`}>
                {stats.total_sent.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {successRate.toFixed(1)}% success rate
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Failed</p>
              <p className={`text-3xl font-bold ${getStatusColor(stats.total_failed, totalNotifications)}`}>
                {stats.total_failed.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {totalNotifications > 0 ? ((stats.total_failed / totalNotifications) * 100).toFixed(1) : 0}% failure rate
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className={`text-3xl font-bold ${getStatusColor(stats.total_pending, totalNotifications)}`}>
                {stats.total_pending.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Awaiting delivery
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-3xl font-bold text-gray-900">
                {totalNotifications.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            All notifications
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Notification Types */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Notification Types</h2>
          </div>
          <div className="p-6">
            {Object.keys(stats.notification_types).length === 0 ? (
              <p className="text-gray-500 text-center py-8">No notifications sent yet</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(stats.notification_types).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-900">
                        {getTypeLabel(type)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">{count}</span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${(count / totalNotifications) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Notifications */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Notifications</h2>
          </div>
          <div className="p-6">
            {stats.recent_notifications.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent notifications</p>
            ) : (
              <div className="space-y-4">
                {stats.recent_notifications.map((notification) => (
                  <div key={notification.id} className="flex items-start space-x-3">
                    <div className={`p-2 rounded-full ${
                      notification.status === 'sent' ? 'bg-green-100' :
                      notification.status === 'failed' ? 'bg-red-100' :
                      notification.status === 'pending' ? 'bg-yellow-100' :
                      'bg-blue-100'
                    }`}>
                      {notification.status === 'sent' ? (
                        <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : notification.status === 'failed' ? (
                        <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {notification.subject}
                      </p>
                      <p className="text-xs text-gray-500">
                        {getTypeLabel(notification.notification_type)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Refresh Stats
          </button>
          <button
            onClick={() => window.location.href = '/settings/notifications'}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Notification Settings
          </button>
          <button
            onClick={() => window.location.href = '/notifications/history'}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            View Full History
          </button>
        </div>
      </div>
    </div>
  )
}