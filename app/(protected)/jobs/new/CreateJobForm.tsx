'use client'

import { useState } from 'react'
import { createJobAction, createJobWithTemplateAction } from './actions'
import type { BudgetTemplate } from '@/lib/types'

export default function CreateJobForm({ templates }: { templates: BudgetTemplate[] }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true)
    try {
      if (selectedTemplateId) {
        formData.append('templateId', selectedTemplateId)
        await createJobWithTemplateAction(formData)
      } else {
        await createJobAction(formData)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6 bg-white p-6 shadow sm:rounded-lg">
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
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm"
            placeholder="Kitchen Renovation"
          />
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
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm"
            placeholder="John Smith"
          />
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
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm"
            placeholder="123 Main St, City, State 12345"
          />
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

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:bg-gray-400"
        >
          {isLoading ? 'Creating...' : 'Create Job'}
        </button>
        <a
          href="/jobs"
          className="flex-1 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 text-center"
        >
          Cancel
        </a>
      </div>
    </form>
  )
}
