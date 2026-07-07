'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import { importScopeItemsAction, type CSVScopeItem, type ImportResult } from './csv/actions'
import { useRouter } from 'next/navigation'

interface RowValidation {
  valid: boolean
  message?: string
}

function parseRow(row: Record<string, unknown>): CSVScopeItem {
  return {
    description: String(row.description || row.Description || ''),
    category: String(row.category || row.Category || ''),
    estimated_material_cost: parseFloat(String(row.estimated_material_cost || row['Estimated Material'] || '0')),
    estimated_labor_hours: parseFloat(String(row.estimated_labor_hours || row['Estimated Labor Hours'] || '0')),
    estimated_labor_rate: parseFloat(String(row.estimated_labor_rate || row['Estimated Labor Rate'] || '50')),
    notes: String(row.notes || row.Notes || '')
  }
}

function validateRow(item: CSVScopeItem): RowValidation {
  if (!item.description.trim()) {
    return { valid: false, message: "Description is missing" }
  }
  if (Number.isNaN(item.estimated_material_cost)) {
    return { valid: false, message: "Material cost isn't a number" }
  }
  if (Number.isNaN(item.estimated_labor_hours)) {
    return { valid: false, message: "Labor hours isn't a number" }
  }
  if (Number.isNaN(item.estimated_labor_rate)) {
    return { valid: false, message: "Labor rate isn't a number" }
  }
  if (item.estimated_material_cost < 0 || item.estimated_labor_hours < 0 || item.estimated_labor_rate < 0) {
    return { valid: false, message: "Negative numbers aren't allowed" }
  }
  return { valid: true }
}

const PREVIEW_RENDER_CAP = 100

export default function CSVImportButton({ budgetVersionId }: { budgetVersionId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<CSVScopeItem[]>([])
  const [validations, setValidations] = useState<RowValidation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [submittedCount, setSubmittedCount] = useState(0)
  const [skippedCount, setSkippedCount] = useState(0)
  const router = useRouter()

  const validCount = validations.filter((v) => v.valid).length
  const invalidCount = validations.length - validCount

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setResult(null)

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const items = (results.data as Record<string, unknown>[]).map(parseRow)
        setRows(items)
        setValidations(items.map(validateRow))
      }
    })
  }

  const handleImport = async () => {
    if (!file || rows.length === 0) return

    const validRows = rows.filter((_, i) => validations[i]?.valid)
    if (validRows.length === 0) return

    setIsLoading(true)
    setResult(null)
    setSubmittedCount(validRows.length)
    setSkippedCount(rows.length - validRows.length)

    try {
      const importResult = await importScopeItemsAction(budgetVersionId, validRows)
      setResult(importResult)
      if (importResult.imported > 0) {
        router.refresh()
      }
    } catch (error) {
      console.error('Import error:', error)
      setResult({
        success: false,
        imported: 0,
        errors: [{ row: 0, message: error instanceof Error ? error.message : 'Import failed' }]
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetAndClose = () => {
    setIsOpen(false)
    setFile(null)
    setRows([])
    setValidations([])
    setResult(null)
    setSubmittedCount(0)
    setSkippedCount(0)
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
      {/* Cascading row-check animation */}
      <style>{`
        @keyframes csv-row-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .csv-row-in {
          opacity: 0;
          animation: csv-row-in 0.25s ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .csv-row-in {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>

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
                onClick={resetAndClose}
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

                {rows.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-700">
                        Preview ({rows.length} row{rows.length === 1 ? '' : 's'})
                      </h3>
                      <p className="text-sm">
                        <span className="font-semibold text-green-700">{validCount} ready</span>
                        {invalidCount > 0 && (
                          <span className="font-semibold text-amber-600"> · {invalidCount} need a fix</span>
                        )}
                      </p>
                    </div>
                    <div className="overflow-x-auto max-h-72 overflow-y-auto rounded border border-gray-200">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-2 py-1 text-center w-8"> </th>
                            <th className="px-2 py-1 text-left">Description</th>
                            <th className="px-2 py-1 text-left">Category</th>
                            <th className="px-2 py-1 text-right">Material</th>
                            <th className="px-2 py-1 text-right">Labor Hrs</th>
                            <th className="px-2 py-1 text-right">Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.slice(0, PREVIEW_RENDER_CAP).map((item, idx) => {
                            const validation = validations[idx]
                            return (
                              <tr
                                key={idx}
                                className={`csv-row-in border-t ${validation?.valid ? '' : 'bg-amber-50'}`}
                                style={{ animationDelay: `${Math.min(idx * 40, 2000)}ms` }}
                              >
                                <td className="px-2 py-1 text-center">
                                  {validation?.valid ? (
                                    <span className="text-green-600 font-bold">✓</span>
                                  ) : (
                                    <span className="text-amber-500 font-bold" title={validation?.message}>⚠</span>
                                  )}
                                </td>
                                <td className="px-2 py-1">
                                  {item.description || <span className="text-gray-400 italic">empty</span>}
                                  {!validation?.valid && (
                                    <span className="block text-xs text-amber-700">
                                      Row {idx + 1}: {validation?.message}
                                    </span>
                                  )}
                                </td>
                                <td className="px-2 py-1">{item.category}</td>
                                <td className="px-2 py-1 text-right">
                                  {Number.isNaN(item.estimated_material_cost) ? '—' : `$${item.estimated_material_cost}`}
                                </td>
                                <td className="px-2 py-1 text-right">
                                  {Number.isNaN(item.estimated_labor_hours) ? '—' : item.estimated_labor_hours}
                                </td>
                                <td className="px-2 py-1 text-right">
                                  {Number.isNaN(item.estimated_labor_rate) ? '—' : `$${item.estimated_labor_rate}`}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                      {rows.length > PREVIEW_RENDER_CAP && (
                        <p className="px-2 py-1 text-xs text-gray-500 border-t">
                          …and {rows.length - PREVIEW_RENDER_CAP} more rows
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={resetAndClose}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                    disabled={!file || rows.length === 0 || validCount === 0 || isLoading}
                  >
                    {isLoading ? 'Importing…' : `Import ${validCount} Item${validCount === 1 ? '' : 's'}`}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={`mb-4 p-4 rounded-md ${
                  result.imported > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <p className="font-medium text-gray-900">
                    {result.imported > 0
                      ? `✓ ${result.imported} of ${submittedCount} rows imported`
                      : '✗ Import Failed'}
                  </p>
                  {result.imported > 0 && result.imported === submittedCount && skippedCount === 0 && (
                    <p className="text-sm text-green-700 mt-1">
                      Clean import — every row was imported successfully.
                    </p>
                  )}
                  {skippedCount > 0 && (
                    <p className="text-sm text-amber-700 mt-1">
                      {skippedCount} row{skippedCount === 1 ? '' : 's'} skipped (failed validation) — fix and re-import.
                    </p>
                  )}
                </div>

                {result.errors.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Rows that need attention:</h3>
                    <div className="max-h-48 overflow-y-auto text-sm">
                      {result.errors.map((error, idx) => (
                        <p key={idx} className="text-amber-700">
                          Row {error.row}: {error.message}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={resetAndClose}
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
