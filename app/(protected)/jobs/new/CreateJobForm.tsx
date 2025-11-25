'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createJobAction, createJobWithTemplateAction } from './actions'
import type { BudgetTemplate } from '@/lib/types'

interface FormErrors {
  name?: string
  client_name?: string
  address?: string
  general?: string
}

export default function CreateJobForm({ templates }: { templates: BudgetTemplate[] }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'Job name is required'
        if (value.trim().length < 3) return 'Job name must be at least 3 characters'
        if (value.trim().length > 100) return 'Job name must be less than 100 characters'
        break
      case 'client_name':
        if (value && value.length > 100) return 'Client name must be less than 100 characters'
        break
      case 'address':
        if (value && value.length > 500) return 'Address must be less than 500 characters'
        break
    }
    return undefined
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setTouched({ ...touched, [name]: true })
    const error = validateField(name, value)
    setErrors({ ...errors, [name]: error })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    if (touched[name]) {
      const error = validateField(name, value)
      setErrors({ ...errors, [name]: error })
    }
  }

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true)
    setErrors({})

    // Validate all fields
    const name = formData.get('name') as string
    const client_name = formData.get('client_name') as string
    const address = formData.get('address') as string

    const newErrors: FormErrors = {}
    const nameError = validateField('name', name)
    const clientError = validateField('client_name', client_name)
    const addressError = validateField('address', address)

    if (nameError) newErrors.name = nameError
    if (clientError) newErrors.client_name = clientError
    if (addressError) newErrors.address = addressError

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setTouched({ name: true, client_name: true, address: true })
      setIsLoading(false)
      return
    }

    try {
      if (selectedTemplateId) {
        formData.append('templateId', selectedTemplateId)
        await createJobWithTemplateAction(formData)
      } else {
        await createJobAction(formData)
      }
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : 'Failed to create job' })
      setIsLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6 bg-white p-6 shadow sm:rounded-lg">
      {errors.general && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{errors.general}</h3>
            </div>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">
          Job Name *
        </label>
        <div className="mt-2">
          <input
            type="text"
            name="name"
            id="name"
            required
            onBlur={handleBlur}
            onChange={handleChange}
            className={`block w-full rounded-md border ${
              errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            } bg-white px-3 py-1.5 text-gray-900 placeholder:text-gray-500 focus:ring-2 sm:text-sm`}
            placeholder="Kitchen Renovation"
            aria-invalid={errors.name ? 'true' : 'false'}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name && (
            <p className="mt-2 text-sm text-red-600" id="name-error">
              {errors.name}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="client_name" className="block text-sm font-medium leading-6 text-gray-900">
          Client Name
        </label>
        <div className="mt-2">
          <input
            type="text"
            name="client_name"
            id="client_name"
            onBlur={handleBlur}
            onChange={handleChange}
            className={`block w-full rounded-md border ${
              errors.client_name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            } bg-white px-3 py-1.5 text-gray-900 placeholder:text-gray-500 focus:ring-2 sm:text-sm`}
            placeholder="John Smith"
            aria-invalid={errors.client_name ? 'true' : 'false'}
            aria-describedby={errors.client_name ? 'client-error' : undefined}
          />
          {errors.client_name && (
            <p className="mt-2 text-sm text-red-600" id="client-error">
              {errors.client_name}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium leading-6 text-gray-900">
          Address
        </label>
        <div className="mt-2">
          <textarea
            id="address"
            name="address"
            rows={2}
            onBlur={handleBlur}
            onChange={handleChange}
            className={`block w-full rounded-md border ${
              errors.address ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            } bg-white px-3 py-1.5 text-gray-900 placeholder:text-gray-500 focus:ring-2 sm:text-sm`}
            placeholder="123 Main St, City, State 12345"
            aria-invalid={errors.address ? 'true' : 'false'}
            aria-describedby={errors.address ? 'address-error' : undefined}
          />
          {errors.address && (
            <p className="mt-2 text-sm text-red-600" id="address-error">
              {errors.address}
            </p>
          )}
        </div>
      </div>

      {templates.length > 0 && (
        <div>
          <label htmlFor="template" className="block text-sm font-medium leading-6 text-gray-900">
            Use Template (optional)
          </label>
          <div className="mt-2">
            <select
              id="template"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">-- Start from scratch --</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.use_count} uses)
                </option>
              ))}
            </select>
            {selectedTemplateId && (
              <p className="mt-2 text-sm text-gray-600">
                This will create the job with pre-filled scope items from the selected template.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 rounded-md bg-blue-600 px-3 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:bg-gray-400 min-h-[44px]"
        >
          {isLoading ? 'Creating...' : 'Create Job'}
        </button>
        <Link
          href="/jobs"
          className="flex-1 rounded-md bg-white px-3 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 text-center flex items-center justify-center min-h-[44px]"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
