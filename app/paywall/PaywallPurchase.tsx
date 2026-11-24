'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  PRO_MONTHLY_PRODUCT_ID,
  getCustomerInfo,
  initRevenueCat,
  loadProMonthlyProduct,
  purchaseProMonthly,
  restorePurchases,
  type RcProMonthlyProduct,
} from '@/lib/revenuecat/client'
import {
  formatDisclosure,
  formatIntroCopy,
  formatPriceLine,
  formatSubscriptionLength,
} from './subscription-copy'
import { notifyNativeUiClosed } from '@/lib/native/status-bar-triggers'

type Phase =
  | 'loading'
  | 'signed-out'
  | 'web-unavailable'
  | 'error'
  | 'ready'
  | 'purchasing'
  | 'restoring'
  | 'success'
  | 'needs-restore'

type FocusTarget = 'try-again' | 'sign-in' | null

const IOS_APP_MESSAGE = 'Subscriptions are available in the RenoMargin iOS app'
const SUBSCRIBED_MESSAGE = "You're subscribed to RenoMargin Pro."
const LOAD_FAILURE_MESSAGE =
  "We couldn't load subscription details. Check your connection and try again."
const PURCHASE_FAILURE_MESSAGE =
  "We couldn't complete the purchase. You weren't charged. Please try again."
const RESTORE_FAILURE_MESSAGE = "We couldn't restore purchases. Please try again."
const PENDING_MESSAGE =
  "Purchase pending approval. You'll get access once it's approved."
const NO_ACTIVE_MESSAGE =
  'No active RenoMargin Pro subscription was found for this Apple ID.'

async function readUserId(): Promise<string | null> {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user?.id ? user.id : null
  } catch {
    console.error('[paywall] session lookup failed')
    return null
  }
}

function liveClass(visible: boolean, tone: 'status' | 'alert'): string {
  if (!visible) return 'sr-only'
  const color = tone === 'alert' ? 'text-red-600' : 'text-gray-700'
  return `mt-4 text-sm ${color}`
}

const SECONDARY_ACTION_CLASS =
  'mt-3 flex w-full justify-center rounded-md bg-white px-4 py-3 text-base font-semibold text-blue-600 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400'

export default function PaywallPurchase() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [product, setProduct] = useState<RcProMonthlyProduct | null>(null)
  const [alertMessage, setAlertMessage] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [subscribed, setSubscribed] = useState(false)
  const [rcReady, setRcReady] = useState(false)
  const [focusTarget, setFocusTarget] = useState<FocusTarget>(null)
  const mounted = useRef(true)
  const inFlight = useRef(false)
  const loadGen = useRef(0)
  const knownUserId = useRef<string | null>(null)
  const tryAgainRef = useRef<HTMLButtonElement>(null)
  const signInRef = useRef<HTMLAnchorElement>(null)

  const load = useCallback(async () => {
    const gen = ++loadGen.current
    const stale = () => !mounted.current || gen !== loadGen.current

    setFocusTarget(null)
    setAlertMessage(null)
    setStatusMessage(null)
    setProduct(null)
    setSubscribed(false)
    setRcReady(false)
    setPhase('loading')
    knownUserId.current = null

    const userId = await readUserId()
    if (stale()) return
    if (!userId) {
      setPhase('signed-out')
      return
    }

    const init = await initRevenueCat(userId)
    if (stale()) return
    if (!init.available) {
      if (init.reason === 'not-native' || init.reason === 'missing-key') {
        setPhase('web-unavailable')
        return
      }
      setAlertMessage(LOAD_FAILURE_MESSAGE)
      setPhase('error')
      setFocusTarget('try-again')
      return
    }

    knownUserId.current = userId
    setRcReady(true)

    let alreadyPro = false
    try {
      const info = await getCustomerInfo()
      if (info.available && info.entitlements.proActive) {
        alreadyPro = true
      }
    } catch {
      // Customer info must not block the paywall.
    }
    if (stale()) return

    const loaded = await loadProMonthlyProduct()
    if (stale()) return

    if (loaded.available) {
      setProduct(loaded.product)
    }

    if (alreadyPro) {
      setSubscribed(true)
      setStatusMessage(SUBSCRIBED_MESSAGE)
      setPhase('success')
      setFocusTarget(null)
      return
    }

    if (loaded.available) {
      setPhase('ready')
      return
    }

    setAlertMessage(LOAD_FAILURE_MESSAGE)
    setPhase('error')
    setFocusTarget('try-again')
  }, [])

  useEffect(() => {
    mounted.current = true
    void load()
    return () => {
      loadGen.current += 1
      mounted.current = false
    }
  }, [load])

  useEffect(() => {
    if (focusTarget === 'try-again') tryAgainRef.current?.focus()
    else if (focusTarget === 'sign-in') signInRef.current?.focus()
  }, [focusTarget, phase, statusMessage, alertMessage])

  async function ensureSession(failureMessage: string): Promise<boolean> {
    const userId = await readUserId()
    if (!mounted.current) return false
    if (!userId) {
      setRcReady(false)
      setPhase('signed-out')
      setFocusTarget('sign-in')
      return false
    }
    if (userId === knownUserId.current) return true

    const identified = await initRevenueCat(userId)
    if (!mounted.current) return false
    if (!identified.available) {
      if (identified.reason === 'not-native' || identified.reason === 'missing-key') {
        setRcReady(false)
        setPhase('web-unavailable')
        return false
      }
      if (identified.reason === 'not-signed-in') {
        setRcReady(false)
        setPhase('signed-out')
        setFocusTarget('sign-in')
        return false
      }
      setAlertMessage(failureMessage)
      setPhase(product ? 'ready' : 'error')
      setFocusTarget(product ? null : 'try-again')
      return false
    }
    knownUserId.current = userId
    setRcReady(true)
    return true
  }

  async function handleSubscribe() {
    if (phase !== 'ready' || subscribed || inFlight.current) return
    inFlight.current = true
    setFocusTarget(null)
    setAlertMessage(null)
    setStatusMessage(null)
    setPhase('purchasing')
    try {
      const ok = await ensureSession(PURCHASE_FAILURE_MESSAGE)
      if (!mounted.current || !ok) return
      const result = await purchaseProMonthly(PRO_MONTHLY_PRODUCT_ID)
      if (!mounted.current) return
      if (!result.available) {
        if (result.reason === 'not-signed-in') {
          setRcReady(false)
          setPhase('signed-out')
          setFocusTarget('sign-in')
          return
        }
        setAlertMessage(PURCHASE_FAILURE_MESSAGE)
        setPhase('ready')
        setFocusTarget(null)
        return
      }
      if ('pending' in result && result.pending) {
        setAlertMessage(null)
        setStatusMessage(PENDING_MESSAGE)
        setPhase('ready')
        setFocusTarget(null)
        return
      }
      if ('cancelled' in result && result.cancelled) {
        setPhase('ready')
        return
      }
      if ('entitlements' in result && result.entitlements.proActive) {
        setSubscribed(true)
        setStatusMessage(SUBSCRIBED_MESSAGE)
        setPhase('success')
        setFocusTarget(null)
        return
      }
      setStatusMessage(null)
      setPhase('needs-restore')
      setFocusTarget(null)
    } catch {
      if (!mounted.current) return
      setAlertMessage(PURCHASE_FAILURE_MESSAGE)
      setPhase('ready')
      setFocusTarget(null)
    } finally {
      inFlight.current = false
      // The StoreKit sheet (if any) has closed: success, cancel or error.
      notifyNativeUiClosed()
    }
  }

  async function handleRestore() {
    if (
      !rcReady ||
      phase === 'loading' ||
      phase === 'purchasing' ||
      phase === 'restoring' ||
      inFlight.current
    ) {
      return
    }
    inFlight.current = true
    setFocusTarget(null)
    setAlertMessage(null)
    setStatusMessage(null)
    setPhase('restoring')
    try {
      const ok = await ensureSession(RESTORE_FAILURE_MESSAGE)
      if (!mounted.current || !ok) return
      const result = await restorePurchases()
      if (!mounted.current) return
      if (!result.available) {
        if (result.reason === 'not-signed-in') {
          setRcReady(false)
          setPhase('signed-out')
          setFocusTarget('sign-in')
          return
        }
        setAlertMessage(RESTORE_FAILURE_MESSAGE)
        setPhase('error')
        setFocusTarget('try-again')
        return
      }
      if (result.entitlements.proActive) {
        setSubscribed(true)
        setStatusMessage(SUBSCRIBED_MESSAGE)
        setPhase('success')
        setFocusTarget(null)
        return
      }
      setSubscribed(false)
      setStatusMessage(NO_ACTIVE_MESSAGE)
      if (product) {
        setPhase('ready')
        return
      }
      setPhase('error')
      setFocusTarget('try-again')
    } catch {
      if (!mounted.current) return
      setAlertMessage(RESTORE_FAILURE_MESSAGE)
      setPhase('error')
      setFocusTarget('try-again')
    } finally {
      inFlight.current = false
      // The StoreKit sheet (if any) has closed: success, cancel or error.
      notifyNativeUiClosed()
    }
  }

  const length = product ? formatSubscriptionLength(product.subscriptionPeriod) : null
  const introCopy = product?.intro ? formatIntroCopy(product.intro) : null
  const priced = Boolean(product && product.priceString && length)
  const showTerms =
    priced &&
    (phase === 'ready' ||
      phase === 'purchasing' ||
      phase === 'restoring' ||
      phase === 'success' ||
      phase === 'needs-restore')
  const showSubscribe = priced && !subscribed && (phase === 'ready' || phase === 'purchasing')
  const restoreDisabled =
    !rcReady || phase === 'loading' || phase === 'purchasing' || phase === 'restoring'
  const statusVisible = phase === 'needs-restore' || Boolean(statusMessage)

  const statusNode =
    phase === 'needs-restore'
      ? [
          "Payment received. Tap Restore Purchases to finish unlocking RenoMargin Pro. If it still doesn't unlock, contact ",
          <Link key="support" href="/support" className="font-medium text-blue-600 hover:text-blue-500">Support</Link>,
          '.',
        ]
      : statusMessage

  return (
    <div className="mt-6">
      {phase === 'loading' && (
        <button
          type="button"
          disabled
          className="mt-6 flex w-full cursor-not-allowed justify-center rounded-md bg-blue-300 px-4 py-3 text-base font-semibold text-white"
        >
          Loading price…
        </button>
      )}

      {phase === 'web-unavailable' && (
        <p className="text-center text-sm text-gray-600">{IOS_APP_MESSAGE}</p>
      )}

      {phase === 'signed-out' && (
        <p className="text-center text-sm text-gray-600">
          <Link
            href="/login"
            ref={signInRef}
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Sign in to subscribe
          </Link>
        </p>
      )}

      {showTerms && product && length && (
        <div className="space-y-3 text-sm leading-5 text-gray-600">
          <p className="text-center text-2xl font-semibold text-gray-900">
            {formatPriceLine(product.priceString, length.perLabel)}
          </p>
          {introCopy && <p>{introCopy}</p>}
          <p>{formatDisclosure(product.priceString, length.lengthLabel, length.perLabel)}</p>
        </div>
      )}

      <p role="status" aria-live="polite" aria-atomic="true" className={liveClass(statusVisible, 'status')}>{statusNode}</p>
      <p role="alert" aria-live="assertive" aria-atomic="true" className={liveClass(Boolean(alertMessage), 'alert')}>{alertMessage}</p>

      {phase === 'error' && (
        <button
          type="button"
          ref={tryAgainRef}
          onClick={() => {
            void load()
          }}
          className="mt-4 flex w-full justify-center rounded-md bg-white px-4 py-3 text-base font-semibold text-blue-600 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          Try again
        </button>
      )}

      {showSubscribe && (
        <button
          type="button"
          onClick={() => {
            void handleSubscribe()
          }}
          disabled={phase !== 'ready'}
          className="mt-6 flex w-full justify-center rounded-md bg-blue-600 px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {phase === 'purchasing' ? 'Subscribing…' : 'Subscribe'}
        </button>
      )}

      {subscribed ? (
        <a
          href="https://apps.apple.com/account/subscriptions"
          target="_blank"
          rel="noopener noreferrer"
          className={SECONDARY_ACTION_CLASS}
        >
          Manage subscription
        </a>
      ) : (
        <button
          type="button"
          onClick={() => {
            void handleRestore()
          }}
          disabled={restoreDisabled}
          className={SECONDARY_ACTION_CLASS}
        >
          {phase === 'restoring' ? 'Restoring…' : 'Restore Purchases'}
        </button>
      )}
    </div>
  )
}
