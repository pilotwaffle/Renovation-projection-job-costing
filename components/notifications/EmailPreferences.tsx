'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { notificationService } from '@/lib/notifications'
import type { NotificationPreferences } from '@/lib/types'

const emailPreferencesSchema = z.object({
  email_address: z.string().email('Invalid email address'),
  timezone: z.string().min(1, 'Timezone is required')
})

type EmailPreferencesFormData = z.infer<typeof emailPreferencesSchema>

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

interface EmailPreferencesProps {
  preferences: NotificationPreferences
  onUpdate: (preferences: NotificationPreferences) => void
}

export function EmailPreferences({ preferences, onUpdate }: EmailPreferencesProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset
  } = useForm<EmailPreferencesFormData>({
    resolver: zodResolver(emailPreferencesSchema),
    defaultValues: {
      email_address: preferences.email_address,
      timezone: preferences.timezone
    }
  })

  const onSubmit = async (data: EmailPreferencesFormData) => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const updatedPreferences = await notificationService.updatePreferences(
        preferences.user_id,
        {
          email_address: data.email_address,
          timezone: data.timezone
        }
      )

      onUpdate(updatedPreferences)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('Failed to update email preferences')
      console.error('Error updating email preferences:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    reset({
      email_address: preferences.email_address,
      timezone: preferences.timezone
    })
    setError(null)
    setSuccess(false)
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          Email Delivery Settings
        </h3>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Email Address */}
          <div>
            <label htmlFor="email_address" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <div className="mt-1">
              <input
                {...register('email_address')}
                type="email"
                id="email_address"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="your@email.com"
              />
              {errors.email_address && (
                <p className="mt-2 text-sm text-red-600">{errors.email_address.message}</p>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-500">
              This email address will receive all notification emails
            </p>
          </div>

          {/* Timezone */}
          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
              Timezone
            </label>
            <div className="mt-1">
              <select
                {...register('timezone')}
                id="timezone"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                {timezones.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
              {errors.timezone && (
                <p className="mt-2 text-sm text-red-600">{errors.timezone.message}</p>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Used for scheduling daily and weekly summary emails
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Email preferences updated successfully
                  </h3>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            {isDirty && (
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving || !isDirty}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}