'use client'

import { useEffect, useRef, useState } from 'react'

type PrintMode = 'client' | 'internal'

export default function PrintButton() {
  const [menuOpen, setMenuOpen] = useState(false)
  const stampRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuOpen])

  const handlePrint = (mode: PrintMode) => {
    setMenuOpen(false)
    const root = document.documentElement
    root.classList.add(`print-${mode}`)

    // Stamp the footer synchronously so it's in the DOM before print
    if (stampRef.current) {
      const label = mode === 'client' ? 'Client Copy' : 'Internal Copy'
      const date = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      stampRef.current.textContent = `${label} · Generated ${date} · RenoMargin`
    }

    const cleanup = () => root.classList.remove('print-client', 'print-internal')
    window.addEventListener('afterprint', cleanup, { once: true })
    window.print()
  }

  return (
    <>
      <div className="relative inline-block print:hidden" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((open) => !open)}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          Print/PDF ▾
        </button>

        {menuOpen && (
          <div className="absolute right-0 z-10 mt-2 w-64 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black/10">
            <button
              onClick={() => handlePrint('client')}
              className="block w-full px-4 py-3 text-left text-sm hover:bg-gray-50 rounded-t-md"
            >
              <span className="font-semibold text-gray-900">Client version</span>
              <span className="mt-0.5 block text-xs text-gray-500">
                Estimated budget only — no actuals, variance, or internal costs
              </span>
            </button>
            <button
              onClick={() => handlePrint('internal')}
              className="block w-full border-t border-gray-100 px-4 py-3 text-left text-sm hover:bg-gray-50 rounded-b-md"
            >
              <span className="font-semibold text-gray-900">Internal version</span>
              <span className="mt-0.5 block text-xs text-gray-500">
                Full detail — estimated vs. actual with variance
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Print-only footer stamp; populated at print time */}
      <div ref={stampRef} className="print-footer hidden" />
    </>
  )
}
