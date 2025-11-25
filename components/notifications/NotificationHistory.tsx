'use client'

import { useState, useEffect } from 'react'
import { notificationService } from '@/lib/notifications'
import type { NotificationLog } from '@/lib/types'
import { format } from 'date-fns'

interface NotificationHistoryProps {
  userId: string
  jobId?: string
}

export function NotificationHistory({ userId, jobId }: NotificationHistoryProps) {
  const [notifications, setNotifications] = useState<NotificationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState<string>('all')

  const pageSize = 20

  useEffect(() => {
    loadNotifications(0, true)
  }, [userId, jobId, filter])

  const loadNotifications = async (pageNum: number, reset: boolean = false) => {
    try {
      setLoading(true)
      setError(null)

      const filterType = filter === 'all' ? undefined : filter
      const { logs, total } = await notificationService.getNotificationHistory(
        userId,
        pageSize,
        pageNum * pageSize,
        jobId
      )

      const filteredLogs = filterType
        ? logs.filter(log => log.notification_type === filterType)
        : logs

      if (reset) {
        setNotifications(filteredLogs)
      } else {
        setNotifications(prev => [...prev, ...filteredLogs])
      }

      setHasMore((pageNum + 1) * pageSize < total)
    } catch (err) {
      setError('Failed to load notification history')
      console.error('Error loading notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadNotifications(nextPage, false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'text-green-600 bg-green-100'
      case 'failed':
        return 'text-red-600 bg-red-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      case 'retrying':
        return 'text-blue-600 bg-blue-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'variance_alert':
        return 'text-orange-600 bg-orange-100'
      case 'milestone_alert':
        return 'text-purple-600 bg-purple-100'
      case 'daily_summary':
        return 'text-blue-600 bg-blue-100'
      case 'weekly_summary':
        return 'text-green-600 bg-green-100'
      case 'change_order_created':
      case 'change_order_updated':
        return 'text-indigo-600 bg-indigo-100'
      case 'budget_exceeded':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'variance_alert':
        return 'Variance Alert'
      case 'milestone_alert':
        return 'Milestone Alert'
      case 'daily_summary':
        return 'Daily Summary'
      case 'weekly_summary':
        return 'Weekly Summary'
      case 'change_order_created':
        return 'Change Order Created'
      case 'change_order_updated':
        return 'Change Order Updated'
      case 'budget_exceeded':
        return 'Budget Exceeded'
      default:
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }

  if (error && notifications.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">{error}</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Notification History</h2>

            {/* Filter */}
            <div className="flex items-center space-x-2">
              <label htmlFor="filter" className="text-sm font-medium text-gray-700">
                Filter:
              </label>
              <select
                id="filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="variance_alert">Variance Alerts</option>
                <option value="milestone_alert">Milestone Alerts</option>
                <option value="daily_summary">Daily Summaries</option>
                <option value="weekly_summary">Weekly Summaries</option>
                <option value="change_order_created">Change Orders</option>
                <option value="budget_exceeded">Budget Exceeded</option>
              </select>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {notifications.length === 0 && !loading && (
            <div className="p-8 text-center text-gray-500">
              No notifications found
            </div>
          )}

          {notifications.map((notification) => (
            <div key={notification.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(notification.notification_type)}`}>
                      {getTypeLabel(notification.notification_type)}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(notification.status)}`}>
                      {notification.status.charAt(0).toUpperCase() + notification.status.slice(1)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {format(new Date(notification.created_at), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>

                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    {notification.subject}
                  </h3>

                  <p className="text-sm text-gray-600 mb-2">
                    To: {notification.email_address}
                  </p>

                  {notification.context_data && Object.keys(notification.context_data).length > 0 && (
                    <div className="bg-gray-50 rounded-md p-3 mt-2">
                      <div className="text-xs font-medium text-gray-700 mb-2">Context:</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries(notification.context_data).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-600 capitalize">
                              {key.replace(/_/g, ' ')}:
                            </span>
                            <span className="text-gray-900 ml-2">
                              {typeof value === 'number' && key.includes('percentage')
                                ? `${value.toFixed(1)}%`
                                : typeof value === 'number' && key.includes('cost')
                                ? `$${value.toFixed(2)}`
                                : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {notification.error_message && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-2">
                      <div className="text-sm font-medium text-red-800">Error:</div>
                      <div className="text-sm text-red-700">{notification.error_message}</div>
                      {notification.delivery_attempts > 1 && (
                        <div className="text-xs text-red-600 mt-1">
                          Attempts: {notification.delivery_attempts}
                        </div>
                      )}
                    </div>
                  )}

                  {notification.sent_at && (
                    <div className="text-xs text-green-600 mt-2">
                      Sent at {format(new Date(notification.sent_at), 'MMM d, yyyy h:mm a')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="p-6">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="text-gray-600">Loading...</span>
              </div>
            </div>
          )}
        </div>

        {hasMore && !loading && (
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={loadMore}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  )
}