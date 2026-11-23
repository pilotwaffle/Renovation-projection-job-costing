'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  PRO_MONTHLY_PRODUCT_ID,
  getCustomerInfo,
  initRevenueCat,
  loadProMonthlyProduct,
  purchaseProMonthly,
  rcLogIn,
  restorePurchases,
  type RcProMonthlyProduct,
} from '@/lib/revenuecat/client'
import {
  formatDisclosure,
  formatIntroCopy,
  formatPriceLine,
  formatSubscriptionLength,
} from './subscription-copy'

type Phase = 'loading' | 'unavailable' | 'ready' | 'purchasing' | 'restoring' | 'success'

const IOS_APP_MESSAGE = 'Subscriptions are available in the RenoMargin iOS app'
const SUBSCRIBED_MESSAGE = "You're subscribed to RenoMargin Pro."

function loadFailureMessage(message?: string): string {
  if (message) return `Couldn't load subscription details. ${message}`
  return "Couldn't load subscription details."
}

export default function PaywallPurchase() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [product, setProduct] = useState<RcProMonthlyProduct | null>(null)
  const [detail, setDetail] = useState<string | null>(null)
  const [alertMessage, setAlertMessage] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [subscribed, setSubscribed] = useState(false)
  const mounted = useRef(true)
  const inFlight = useRef(false)

  useEffect(() => {
    mounted.current = true
    let cancelled = false

    async function load() {
      const init = await initRevenueCat()
      if (cancelled) return

      if (!init.available) {
        setDetail(
          init.reason === 'error' ? loadFailureMessage(init.message) : IOS_APP_MESSAGE
        )
        setPhase('unavailable')
        return
      }

      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user?.id) {
          await rcLogIn(user.id)
        }
      } catch {
        // A missing session must not block the purchase.
      }
      if (cancelled) return

      let alreadyPro = false
      try {
        const info = await getCustomerInfo()
        if (info.available && info.entitlements.proActive) {
          alreadyPro = true
        }
      } catch {
        // Customer info must not block the paywall.
      }
      if (cancelled) return

      const loaded = await loadProMonthlyProduct()
      if (cancelled) return

      if (loaded.available) {
        setProduct(loaded.product)
      }

      if (alreadyPro) {
        setSubscribed(true)
        setStatusMessage(SUBSCRIBED_MESSAGE)
        setPhase('success')
        return
      }

      if (loaded.available) {
        setPhase('ready')
        return
      }

      setDetail(
        loaded.reason === 'error' ? loadFailureMessage(loaded.message) : IOS_APP_MESSAGE
      )
      setPhase('unavailable')
    }

    void load()
    return () => {
      cancelled = true
      mounted.current = false
    }
  }, [])

  async function handleSubscribe() {
    if (phase !== 'ready' || subscribed || inFlight.current) return
    inFlight.current = true
    setAlertMessage(null)
    setStatusMessage(null)
    setPhase('purchasing')
    try {
      const result = await purchaseProMonthly(PRO_MONTHLY_PRODUCT_ID)
      if (!mounted.current) return
      if (!result.available) {
        setAlertMessage(
          result.message
            ? `Couldn't complete the purchase. ${result.message}`
            : "Couldn't complete the purchase."
        )
        setPhase('ready')
        return
      }
      if (result.cancelled) {
        setPhase('ready')
        return
      }
      if (result.entitlements.proActive) {
        setSubscribed(true)
        setStatusMessage(SUBSCRIBED_MESSAGE)
        setPhase('success')
        return
      }
      setPhase('ready')
    } catch {
      if (!mounted.current) return
      setAlertMessage("Couldn't complete the purchase.")
      setPhase('ready')
    } finally {
      inFlight.current = false
    }
  }

  async function handleRestore() {
    if (
      phase === 'loading' ||
      phase === 'unavailable' ||
      phase === 'purchasing' ||
      phase === 'restoring' ||
      inFlight.current
    ) {
      return
    }
    inFlight.current = true
    setAlertMessage(null)
    setStatusMessage(null)
    setPhase('restoring')
    try {
      const result = await restorePurchases()
      if (!mounted.current) return
      if (result.available && result.entitlements.proActive) {
        setSubscribed(true)
        setStatusMessage(SUBSCRIBED_MESSAGE)
        setPhase('success')
        return
      }
      if (result.available) {
        setSubscribed(false)
        setStatusMessage(
          'No active RenoMargin Pro subscription was found for this Apple ID.'
        )
        setPhase(product ? 'ready' : 'unavailable')
        return
      }
      setAlertMessage(
        result.message
          ? `Couldn't restore purchases. ${result.message}`
          : "Couldn't restore purchases."
      )
      setPhase(subscribed ? 'success' : product ? 'ready' : 'unavailable')
      if (subscribed) setStatusMessage(SUBSCRIBED_MESSAGE)
    } catch {
      if (!mounted.current) return
      setAlertMessage("Couldn't restore purchases.")
      setPhase(subscribed ? 'success' : product ? 'ready' : 'unavailable')
      if (subscribed) setStatusMessage(SUBSCRIBED_MESSAGE)
    } finally {
      inFlight.current = false
    }
  }

  const length = product ? formatSubscriptionLength(product.subscriptionPeriod) : null
  const introCopy = product?.intro ? formatIntroCopy(product.intro) : null
  const showTerms =
    Boolean(product && length) &&
    (phase === 'ready' || phase === 'purchasing' || phase === 'restoring' || phase === 'success')
  const subscribeDisabled = phase !== 'ready'
  const restoreDisabled = phase !== 'ready' && phase !== 'success'

  return (
    <div className="mt-6">
      {phase === 'loading' && (
        <p className="text-center text-sm text-gray-600">Loading subscription price…</p>
      )}

      {phase === 'unavailable' && detail && (
        <p className="text-center text-sm text-gray-600">{detail}</p>
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

      {alertMessage && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {alertMessage}
        </p>
      )}

      {statusMessage && (
        <p role="status" className="mt-4 text-sm text-gray-700">
          {statusMessage}
        </p>
      )}

      {!subscribed && (
        <button
          type="button"
          onClick={handleSubscribe}
          disabled={subscribeDisabled}
          className="mt-6 flex w-full justify-center rounded-md bg-blue-600 px-4 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {phase === 'purchasing' ? 'Subscribing…' : 'Subscribe'}
        </button>
      )}

      <button
        type="button"
        onClick={handleRestore}
        disabled={restoreDisabled}
        className="mt-3 flex w-full justify-center rounded-md bg-white px-4 py-3 text-base font-semibold text-blue-600 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
      >
        {phase === 'restoring' ? 'Restoring…' : 'Restore Purchases'}
      </button>
    </div>
  )
}
