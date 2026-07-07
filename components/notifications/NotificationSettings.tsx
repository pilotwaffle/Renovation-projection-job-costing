'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { notificationService } from '@/lib/notifications'
import type { NotificationSettingsForm, NotificationPreferences } from '@/lib/types'
import ThresholdHindsight from './ThresholdHindsight'

const notificationSettingsSchema = z.object({
  variance_alerts_enabled: z.boolean(),
  variance_threshold_percentage: z.number().min(0).max(100),
  change_order_notifications_enabled: z.boolean(),
  daily_summary_enabled: z.boolean(),
  weekly_summary_enabled: z.boolean(),
  milestone_alerts_enabled: z.boolean(),
  milestone_thresholds: z.array(z.number().min(0).max(100)).min(1),
  email_address: z.string().email('Invalid email address'),
  timezone: z.string().min(1, 'Timezone is required')
})

type NotificationSettingsFormData = z.infer<typeof notificationSettingsSchema>

const timezones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' }
]

const defaultMilestoneThresholds = [50, 75, 90]

interface NotificationSettingsProps {
  userId: string
  onSave?: (preferences: NotificationPreferences) => void
}

export function NotificationSettings({ userId, onSave }: NotificationSettingsProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty }
  } = useForm<NotificationSettingsFormData>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      variance_alerts_enabled: true,
      variance_threshold_percentage: 10,
      change_order_notifications_enabled: true,
      daily_summary_enabled: false,
      weekly_summary_enabled: true,
      milestone_alerts_enabled: true,
      milestone_thresholds: defaultMilestoneThresholds,
      email_address: '',
      timezone: 'UTC'
    }
  })

  const watchedValues = watch()

  useEffect(() => {
    loadPreferences()
  }, [userId])

  const loadPreferences = async () => {
    try {
      setLoading(true)
      const prefs = await notificationService.getPreferences(userId)

      if (prefs) {
        setPreferences(prefs)
        reset({
          variance_alerts_enabled: prefs.variance_alerts_enabled,
          variance_threshold_percentage: prefs.variance_threshold_percentage,
          change_order_notifications_enabled: prefs.change_order_notifications_enabled,
          daily_summary_enabled: prefs.daily_summary_enabled,
          weekly_summary_enabled: prefs.weekly_summary_enabled,
          milestone_alerts_enabled: prefs.milestone_alerts_enabled,
          milestone_thresholds: prefs.milestone_thresholds,
          email_address: prefs.email_address,
          timezone: prefs.timezone
        })
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: NotificationSettingsFormData) => {
    try {
      setSaving(true)
      const updatedPrefs = await notificationService.updatePreferences(userId, data)
      setPreferences(updatedPrefs)
      onSave?.(updatedPrefs)
    } catch (error) {
      console.error('Error saving notification preferences:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleTestNotification = async (type: 'variance_alert' | 'milestone_alert' | 'daily_summary') => {
    try {
      setTesting(type)
      await notificationService.sendTestNotification(userId, type)
      alert('Test notification sent! Check your email.')
    } catch (error) {
      console.error('Error sending test notification:', error)
      alert('Failed to send test notification. Please check your settings.')
    } finally {
      setTesting(null)
    }
  }

  const handleMilestoneThresholdChange = (index: number, value: string) => {
    const newThresholds = [...watchedValues.milestone_thresholds]
    const numValue = parseInt(value) || 0

    if (numValue >= 0 && numValue <= 100) {
      newThresholds[index] = numValue
      setValue('milestone_thresholds', newThresholds)
    }
  }

  const addMilestoneThreshold = () => {
    const newThresholds = [...watchedValues.milestone_thresholds, 0]
    setValue('milestone_thresholds', newThresholds)
  }

  const removeMilestoneThreshold = (index: number) => {
    if (watchedValues.milestone_thresholds.length > 1) {
      const newThresholds = watchedValues.milestone_thresholds.filter((_, i) => i !== index)
      setValue('milestone_thresholds', newThresholds)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Notification Settings</h2>
          <p className="mt-1 text-gray-600">
            Configure how you receive budget and project notifications
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Email Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Email Settings</h3>

            <div>
              <label htmlFor="email_address" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                {...register('email_address')}
                type="email"
                id="email_address"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="your@email.com"
              />
              {errors.email_address && (
                <p className="mt-1 text-sm text-red-600">{errors.email_address.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
                Timezone
              </label>
              <select
                {...register('timezone')}
                id="timezone"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {timezones.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
              {errors.timezone && (
                <p className="mt-1 text-sm text-red-600">{errors.timezone.message}</p>
              )}
            </div>
          </div>

          {/* Budget Alerts */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Budget Alerts</h3>

            <div className="flex items-center">
              <input
                {...register('variance_alerts_enabled')}
                type="checkbox"
                id="variance_alerts_enabled"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="variance_alerts_enabled" className="ml-2 block text-sm text-gray-900">
                Enable variance alerts
              </label>
            </div>

            {watchedValues.variance_alerts_enabled && (
              <div>
                <label htmlFor="variance_threshold_percentage" className="block text-sm font-medium text-gray-700">
                  Variance Threshold (%)
                </label>
                <div className="mt-2 flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    aria-label="Variance threshold slider"
                    value={
                      Number.isFinite(watchedValues.variance_threshold_percentage)
                        ? Math.min(watchedValues.variance_threshold_percentage, 100)
                        : 10
                    }
                    onChange={(e) =>
                      setValue('variance_threshold_percentage', Number(e.target.value), {
                        shouldDirty: true,
                        shouldValidate: true
                      })
                    }
                    className="h-2 flex-1 cursor-pointer accent-blue-600"
                  />
                  <input
                    {...register('variance_threshold_percentage', { valueAsNumber: true })}
                    type="number"
                    id="variance_threshold_percentage"
                    min="0"
                    max="100"
                    step="0.1"
                    className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                {errors.variance_threshold_percentage && (
                  <p className="mt-1 text-sm text-red-600">{errors.variance_threshold_percentage.message}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Send alert when budget variance exceeds this percentage
                </p>
                <ThresholdHindsight
                  threshold={
                    Number.isFinite(watchedValues.variance_threshold_percentage)
                      ? watchedValues.variance_threshold_percentage
                      : 10
                  }
                />
              </div>
            )}

            <div className="flex items-center">
              <input
                {...register('milestone_alerts_enabled')}
                type="checkbox"
                id="milestone_alerts_enabled"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="milestone_alerts_enabled" className="ml-2 block text-sm text-gray-900">
                Enable milestone alerts
              </label>
            </div>

            {watchedValues.milestone_alerts_enabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Milestone Thresholds (%)
                </label>
                <div className="space-y-2 mt-1">
                  {watchedValues.milestone_thresholds.map((threshold, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={threshold}
                        onChange={(e) => handleMilestoneThresholdChange(index, e.target.value)}
                        min="0"
                        max="100"
                        step="5"
                        className="block flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-500">%</span>
                      {watchedValues.milestone_thresholds.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMilestoneThreshold(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addMilestoneThreshold}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    + Add Threshold
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Send alerts when variance reaches these percentages
                </p>
              </div>
            )}
          </div>

          {/* Change Orders */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Change Orders</h3>

            <div className="flex items-center">
              <input
                {...register('change_order_notifications_enabled')}
                type="checkbox"
                id="change_order_notifications_enabled"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="change_order_notifications_enabled" className="ml-2 block text-sm text-gray-900">
                Enable change order notifications
              </label>
            </div>
          </div>

          {/* Summaries */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Project Summaries</h3>

            <div className="flex items-center">
              <input
                {...register('daily_summary_enabled')}
                type="checkbox"
                id="daily_summary_enabled"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="daily_summary_enabled" className="ml-2 block text-sm text-gray-900">
                Enable daily summaries
              </label>
            </div>

            <div className="flex items-center">
              <input
                {...register('weekly_summary_enabled')}
                type="checkbox"
                id="weekly_summary_enabled"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="weekly_summary_enabled" className="ml-2 block text-sm text-gray-900">
                Enable weekly summaries
              </label>
            </div>
          </div>

          {/* Test Notifications */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Test Notifications</h3>
            <p className="text-sm text-gray-600">
              Send test notifications to verify your email settings are working correctly.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleTestNotification('variance_alert')}
                disabled={testing === 'variance_alert' || !watchedValues.email_address}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
              >
                {testing === 'variance_alert' ? 'Sending...' : 'Test Variance Alert'}
              </button>

              <button
                type="button"
                onClick={() => handleTestNotification('milestone_alert')}
                disabled={testing === 'milestone_alert' || !watchedValues.email_address}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
              >
                {testing === 'milestone_alert' ? 'Sending...' : 'Test Milestone Alert'}
              </button>

              <button
                type="button"
                onClick={() => handleTestNotification('daily_summary')}
                disabled={testing === 'daily_summary' || !watchedValues.email_address}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
              >
                {testing === 'daily_summary' ? 'Sending...' : 'Test Daily Summary'}
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || !isDirty}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}