'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  initRevenueCat,
  rcLogIn,
  getCustomerInfo,
  getOfferings,
  restorePurchases,
  isNativePlatform,
  hasPublicKey,
  type RcResult,
} from '@/lib/revenuecat/client'

type LastResult = {
  action: string
  data: unknown
} | null

export default function Diagnostics() {
  const [lastResult, setLastResult] = useState<LastResult>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [proActive, setProActive] = useState<boolean | 'unknown'>('unknown')

  const platform = isNativePlatform() ? 'native' : 'web'
  const keyPresent = hasPublicKey()

  function trackEntitlements(result: RcResult<{ entitlements?: { proActive: boolean } }>) {
    if (result.available && 'entitlements' in result && result.entitlements) {
      setProActive(result.entitlements.proActive)
    }
  }

  async function run(action: string, fn: () => Promise<unknown>) {
    setPending(action)
    try {
      const data = await fn()
      setLastResult({ action, data })
      if (data && typeof data === 'object') {
        trackEntitlements(data as RcResult<{ entitlements?: { proActive: boolean } }>)
      }
    } catch (err) {
      // initRevenueCat/etc. are designed to never throw, but guard the UI
      // layer too so a diagnostics page can never blank-screen.
      setLastResult({
        action,
        data: { error: err instanceof Error ? err.message : String(err) },
      })
    } finally {
      setPending(null)
    }
  }

  async function handleInitialize() {
    await run('initRevenueCat', () => initRevenueCat())
  }

  async function handleLogIn() {
    await run('rcLogIn', async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return { available: false, reason: 'no-supabase-session' as const }
      }

      return rcLogIn(user.id)
    })
  }

  async function handleGetCustomerInfo() {
    await run('getCustomerInfo', () => getCustomerInfo())
  }

  async function handleGetOfferings() {
    await run('getOfferings', () => getOfferings())
  }

  async function handleRestore() {
    await run('restorePurchases', () => restorePurchases())
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-gray-900">RevenueCat Diagnostics</h1>

      <dl className="mt-4 space-y-1 text-sm text-gray-700">
        <div>
          <dt className="inline font-medium">Platform:</dt>{' '}
          <dd className="inline">{platform}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Key present:</dt>{' '}
          <dd className="inline">{keyPresent ? 'yes' : 'no'}</dd>
        </div>
        <div>
          <dt className="inline font-medium">pro entitlement active:</dt>{' '}
          <dd className="inline">
            {proActive === 'unknown' ? 'unknown' : proActive ? 'yes' : 'no'}
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleInitialize}
          disabled={pending !== null}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {pending === 'initRevenueCat' ? 'Initializing…' : 'Initialize RevenueCat'}
        </button>
        <button
          type="button"
          onClick={handleLogIn}
          disabled={pending !== null}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {pending === 'rcLogIn' ? 'Logging in…' : 'Log in (Supabase uid)'}
        </button>
        <button
          type="button"
          onClick={handleGetCustomerInfo}
          disabled={pending !== null}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {pending === 'getCustomerInfo' ? 'Fetching…' : 'Get CustomerInfo'}
        </button>
        <button
          type="button"
          onClick={handleGetOfferings}
          disabled={pending !== null}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {pending === 'getOfferings' ? 'Fetching…' : 'Get Offerings'}
        </button>
        <button
          type="button"
          onClick={handleRestore}
          disabled={pending !== null}
          className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {pending === 'restorePurchases' ? 'Restoring…' : 'Restore Purchases'}
        </button>
      </div>

      {lastResult && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-900">
            Last result: {lastResult.action}
          </h2>
          <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-gray-900 p-3 text-xs text-gray-100">
            {JSON.stringify(lastResult.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
