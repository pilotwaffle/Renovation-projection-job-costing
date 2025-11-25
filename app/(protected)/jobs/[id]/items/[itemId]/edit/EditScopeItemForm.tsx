'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateScopeItem } from './actions'

interface EditFormProps {
  item: {
    id: string
    description: string
    estimated_material_cost: number
    estimated_labor_hours: number
    estimated_labor_rate: number
    actual_material_cost: number
    actual_labor_hours: number
    notes: string | null
    is_completed: boolean
  }
  jobId: string
}

export default function EditScopeItemForm({ item, jobId }: EditFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [optimisticItem, setOptimisticItem] = useState(item)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (formData: FormData) => {
    setError(null)

    // Optimistically update the UI immediately
    const newData = {
      ...optimisticItem,
      description: formData.get('description') as string,
      estimated_material_cost: parseFloat(formData.get('estimated_material_cost') as string) || 0,
      estimated_labor_hours: parseFloat(formData.get('estimated_labor_hours') as string) || 0,
      estimated_labor_rate: parseFloat(formData.get('estimated_labor_rate') as string) || 50,
      actual_material_cost: parseFloat(formData.get('actual_material_cost') as string) || 0,
      actual_labor_hours: parseFloat(formData.get('actual_labor_hours') as string) || 0,
      notes: (formData.get('notes') as string) || null,
      is_completed: formData.get('is_completed') === 'on',
    }

    setOptimisticItem(newData)

    // Perform the actual update in a transition
    startTransition(async () => {
      try {
        await updateScopeItem(formData)
        // The redirect will happen in the action, but we can also navigate
        router.push(`/jobs/${jobId}`)
        router.refresh()
      } catch (err) {
        // Revert optimistic update on error
        setOptimisticItem(item)
        setError(err instanceof Error ? err.message : 'Failed to update item')
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-6 bg-white p-6 shadow sm:rounded-lg">
      <input type="hidden" name="item_id" value={item.id} />
      <input type="hidden" name="job_id" value={jobId} />

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-900">
          Description *
        </label>
        <input
          type="text"
          name="description"
          id="description"
          required
          defaultValue={optimisticItem.description}
          className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
        />
      </div>

      {/* Estimated Costs (Editable) */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Estimated Budget</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="estimated_material_cost" className="block text-sm font-medium text-gray-900">
              Material Cost
            </label>
            <input
              type="number"
              name="estimated_material_cost"
              id="estimated_material_cost"
              step="0.01"
              min="0"
              defaultValue={optimisticItem.estimated_material_cost}
              className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
            />
          </div>
          <div>
            <label htmlFor="estimated_labor_hours" className="block text-sm font-medium text-gray-900">
              Labor Hours
            </label>
            <input
              type="number"
              name="estimated_labor_hours"
              id="estimated_labor_hours"
              step="0.25"
              min="0"
              defaultValue={optimisticItem.estimated_labor_hours}
              className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
            />
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor="estimated_labor_rate" className="block text-sm font-medium text-gray-900">
            Labor Rate ($/hour)
          </label>
          <input
            type="number"
            name="estimated_labor_rate"
            id="estimated_labor_rate"
            step="0.01"
            min="0"
            defaultValue={optimisticItem.estimated_labor_rate}
            className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
          />
        </div>
      </div>

      {/* Actual Costs (Editable) */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Actual Costs</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="actual_material_cost" className="block text-sm font-medium text-gray-900">
              Actual Material Cost
            </label>
            <input
              type="number"
              name="actual_material_cost"
              id="actual_material_cost"
              step="0.01"
              min="0"
              defaultValue={optimisticItem.actual_material_cost}
              className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="actual_labor_hours" className="block text-sm font-medium text-gray-900">
              Actual Labor Hours
            </label>
            <input
              type="number"
              name="actual_labor_hours"
              id="actual_labor_hours"
              step="0.25"
              min="0"
              defaultValue={optimisticItem.actual_labor_hours}
              className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
            />
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-900">
          Notes
        </label>
        <textarea
          name="notes"
          id="notes"
          rows={3}
          defaultValue={optimisticItem.notes || ''}
          className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-900"
          placeholder="Any notes about the actual costs..."
        />
      </div>

      <div className="flex items-center gap-4">
        <input
          type="checkbox"
          name="is_completed"
          id="is_completed"
          defaultChecked={optimisticItem.is_completed}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="is_completed" className="text-sm font-medium text-gray-900">
          Mark as completed
        </label>
      </div>

      {isPending && (
        <div className="rounded-md bg-blue-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-blue-800">Saving changes...</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isPending ? 'Updating...' : 'Update Item'}
        </button>
        <a
          href={`/jobs/${jobId}`}
          className="flex-1 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 text-center"
        >
          Cancel
        </a>
      </div>
    </form>
  )
}
