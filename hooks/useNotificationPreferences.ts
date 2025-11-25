'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { notificationService } from '@/lib/notifications'
import type { NotificationPreferences, NotificationSettingsForm } from '@/lib/types'

const notificationPreferencesSchema = z.object({
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

type NotificationPreferencesFormData = z.infer<typeof notificationPreferencesSchema>

export function useNotificationPreferences(userId: string) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<NotificationPreferencesFormData>({
    resolver: zodResolver(notificationPreferencesSchema),
    defaultValues: {
      variance_alerts_enabled: true,
      variance_threshold_percentage: 10,
      change_order_notifications_enabled: true,
      daily_summary_enabled: false,
      weekly_summary_enabled: true,
      milestone_alerts_enabled: true,
      milestone_thresholds: [50, 75, 90],
      email_address: '',
      timezone: 'UTC'
    }
  })

  const loadPreferences = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)
      const prefs = await notificationService.getPreferences(userId)
      setPreferences(prefs)

      if (prefs) {
        form.reset({
          variance_alerts_enabled: prefs.variance_alerts_enabled,
          variance_threshold_percentage: parseFloat(prefs.variance_threshold_percentage.toString()),
          change_order_notifications_enabled: prefs.change_order_notifications_enabled,
          daily_summary_enabled: prefs.daily_summary_enabled,
          weekly_summary_enabled: prefs.weekly_summary_enabled,
          milestone_alerts_enabled: prefs.milestone_alerts_enabled,
          milestone_thresholds: prefs.milestone_thresholds,
          email_address: prefs.email_address,
          timezone: prefs.timezone
        })
      }
    } catch (err) {
      setError('Failed to load notification preferences')
      console.error('Error loading preferences:', err)
    } finally {
      setLoading(false)
    }
  }, [userId, form])

  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  const savePreferences = useCallback(async (data: NotificationPreferencesFormData) => {
    if (!userId) throw new Error('User ID is required')

    try {
      setLoading(true)
      setError(null)
      const updatedPrefs = await notificationService.updatePreferences(userId, data)
      setPreferences(updatedPrefs)
      return updatedPrefs
    } catch (err) {
      setError('Failed to save notification preferences')
      console.error('Error saving preferences:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [userId])

  const createPreferences = useCallback(async (emailAddress: string) => {
    if (!userId) throw new Error('User ID is required')

    try {
      setLoading(true)
      setError(null)
      const prefs = await notificationService.createDefaultPreferences(userId, emailAddress)
      setPreferences(prefs)

      form.reset({
        variance_alerts_enabled: prefs.variance_alerts_enabled,
        variance_threshold_percentage: parseFloat(prefs.variance_threshold_percentage.toString()),
        change_order_notifications_enabled: prefs.change_order_notifications_enabled,
        daily_summary_enabled: prefs.daily_summary_enabled,
        weekly_summary_enabled: prefs.weekly_summary_enabled,
        milestone_alerts_enabled: prefs.milestone_alerts_enabled,
        milestone_thresholds: prefs.milestone_thresholds,
        email_address: prefs.email_address,
        timezone: prefs.timezone
      })

      return prefs
    } catch (err) {
      setError('Failed to create notification preferences')
      console.error('Error creating preferences:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [userId, form])

  const resetForm = useCallback(() => {
    if (preferences) {
      form.reset({
        variance_alerts_enabled: preferences.variance_alerts_enabled,
        variance_threshold_percentage: parseFloat(preferences.variance_threshold_percentage.toString()),
        change_order_notifications_enabled: preferences.change_order_notifications_enabled,
        daily_summary_enabled: preferences.daily_summary_enabled,
        weekly_summary_enabled: preferences.weekly_summary_enabled,
        milestone_alerts_enabled: preferences.milestone_alerts_enabled,
        milestone_thresholds: preferences.milestone_thresholds,
        email_address: preferences.email_address,
        timezone: preferences.timezone
      })
    }
  }, [preferences, form])

  return {
    preferences,
    loading,
    error,
    form,
    loadPreferences,
    savePreferences,
    createPreferences,
    resetForm
  }
}