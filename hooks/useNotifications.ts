'use client'

import { useState, useEffect, useCallback } from 'react'
import { notificationService } from '@/lib/notifications'
import type { NotificationPreferences, NotificationSettingsForm } from '@/lib/types'

export function useNotifications(userId: string) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPreferences = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)
      const prefs = await notificationService.getPreferences(userId)
      setPreferences(prefs)
    } catch (err) {
      setError('Failed to load notification preferences')
      console.error('Error loading preferences:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  const updatePreferences = useCallback(async (settings: Partial<NotificationSettingsForm>) => {
    if (!userId) throw new Error('User ID is required')

    try {
      setLoading(true)
      setError(null)
      const updatedPrefs = await notificationService.updatePreferences(userId, settings)
      setPreferences(updatedPrefs)
      return updatedPrefs
    } catch (err) {
      setError('Failed to update notification preferences')
      console.error('Error updating preferences:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [userId])

  const createDefaultPreferences = useCallback(async (emailAddress: string) => {
    if (!userId) throw new Error('User ID is required')

    try {
      setLoading(true)
      setError(null)
      const prefs = await notificationService.createDefaultPreferences(userId, emailAddress)
      setPreferences(prefs)
      return prefs
    } catch (err) {
      setError('Failed to create notification preferences')
      console.error('Error creating preferences:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [userId])

  return {
    preferences,
    loading,
    error,
    loadPreferences,
    updatePreferences,
    createDefaultPreferences
  }
}

// Hook for triggering notifications based on budget changes
export function useBudgetNotifications() {
  const triggerVarianceCheck = useCallback(async (jobId: string, budgetVersionId: string) => {
    try {
      await notificationService.triggerVarianceCheck(jobId, budgetVersionId)
    } catch (error) {
      console.error('Error triggering variance check:', error)
      throw error
    }
  }, [])

  const triggerChangeOrderNotification = useCallback(async (
    userId: string,
    jobId: string,
    changeOrderDetails: Record<string, any>,
    type: 'created' | 'updated' = 'created'
  ) => {
    try {
      await notificationService.queueChangeOrderNotification(userId, jobId, changeOrderDetails, type)
    } catch (error) {
      console.error('Error triggering change order notification:', error)
      throw error
    }
  }, [])

  return {
    triggerVarianceCheck,
    triggerChangeOrderNotification
  }
}