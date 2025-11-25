'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import { importScopeItemsAction, type CSVScopeItem, type ImportResult } from './csv/actions'
import { useRouter } from 'next/navigation'

export default function CSVImportButton({ budgetVersionId }: { budgetVersionId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<CSVScopeItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setResult(null)

    // Parse CSV for preview
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const items: CSVScopeItem[] = (results.data as Record<string, unknown>[]).map((row) => ({
          description: String(row.description || row.Description || ''),
          category: String(row.category || row.Category || ''),
          estimated_material_cost: parseFloat(String(row.estimated_material_cost || row['Estimated Material'] || '0')),
          estimated_labor_hours: parseFloat(String(row.estimated_labor_hours || row['Estimated Labor Hours'] || '0')),
          estimated_labor_rate: parseFloat(String(row.estimated_labor_rate || row['Estimated Labor Rate'] || '50')),
          notes: String(row.notes || row.Notes || '')
        }))
        setPreview(items.slice(0, 5)) // Show first 5 rows
      }
    })
  }

  const handleImport = async () => {
    if (!file) return

    setIsLoading(true)
    setResult(null)

    try {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const items: CSVScopeItem[] = (results.data as Record<string, unknown>[]).map((row) => ({
            description: String(row.description || row.Description || ''),
            category: String(row.category || row.Category || ''),
            estimated_material_cost: parseFloat(String(row.estimated_material_cost || row['Estimated Material'] || '0')),
            estimated_labor_hours: parseFloat(String(row.estimated_labor_hours || row['Estimated Labor Hours'] || '0')),
            estimated_labor_rate: parseFloat(String(row.estimated_labor_rate || row['Estimated Labor Rate'] || '50')),
            notes: String(row.notes || row.Notes || '')
          }))

          const importResult = await importScopeItemsAction(budgetVersionId, items)
          setResult(importResult)
          setIsLoading(false)

          if (importResult.imported > 0) {
            router.refresh()
          }
        }
      })
    } catch (error) {
      console.error('Import error:', error)
      setResult({
        success: false,
        imported: 0,
        errors: [{ row: 0, message: error instanceof Error ? error.message : 'Import failed' }]
      })
      setIsLoading(false)
    }
  }

  const downloadTemplate = () => {
    const template = `description,category,estimated_material_cost,estimated_labor_hours,estimated_labor_rate,notes
Demolish old cabinets,Demo,500,8,50,Include disposal
Install new cabinets,Cabinets,5000,16,50,
Install countertops,Countertops,3000,8,50,
Electrical work,Electrical,1000,12,50,New outlets and lighting`

    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'scope_items_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
      >
        Import CSV
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">Import Scope Items from CSV</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-600 hover:text-gray-900"
              >
                ✕
              </button>
            </div>

            {!result ? (
              <>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Upload a CSV file with scope items. Required columns: description, category, estimated_material_cost, estimated_labor_hours, estimated_labor_rate
                  </p>
                  <button
                    onClick={downloadTemplate}
                    className="text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    Download CSV Template
                  </button>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select CSV File
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                  />
                </div>

                {preview.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Preview (First 5 rows)</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-1 text-left">Description</th>
                            <th className="px-2 py-1 text-left">Category</th>
                            <th className="px-2 py-1 text-right">Material</th>
                            <th className="px-2 py-1 text-right">Labor Hrs</th>
                            <th className="px-2 py-1 text-right">Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.map((item, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="px-2 py-1">{item.description}</td>
                              <td className="px-2 py-1">{item.category}</td>
                              <td className="px-2 py-1 text-right">${item.estimated_material_cost}</td>
                              <td className="px-2 py-1 text-right">{item.estimated_labor_hours}</td>
                              <td className="px-2 py-1 text-right">${item.estimated_labor_rate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                    disabled={!file || isLoading}
                  >
                    {isLoading ? 'Importing...' : 'Import Items'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={`mb-4 p-4 rounded-md ${
                  result.imported > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <p className="font-medium text-gray-900">
                    {result.imported > 0 ? '✓ Import Successful' : '✗ Import Failed'}
                  </p>
                  <p className="text-sm text-gray-900 mt-1">
                    Imported {result.imported} items
                  </p>
                </div>

                {result.errors.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Warnings/Errors:</h3>
                    <div className="max-h-48 overflow-y-auto text-sm">
                      {result.errors.map((error, idx) => (
                        <p key={idx} className="text-red-600">
                          Row {error.row}: {error.message}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    setIsOpen(false)
                    setFile(null)
                    setPreview([])
                    setResult(null)
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
