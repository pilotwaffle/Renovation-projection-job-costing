'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCustomerInfo, initRevenueCat } from '@/lib/revenuecat/client'

const CHECKING_MESSAGE = 'Checking your subscription…'
const WEB_MESSAGE = 'Subscriptions are available in the RenoMargin iOS app'
const UNKNOWN_MESSAGE = "We couldn't check your subscription."
const UNSUBSCRIBED_MESSAGE = 'RenoMargin Pro is the paid plan for this account.'
const SUBSCRIBED_MESSAGE = "You're subscribed to RenoMargin Pro."

type SubscriptionStatus = 'loading' | 'web' | 'unknown' | 'unsubscribed' | 'subscribed'

const COPY: Record<SubscriptionStatus, { body: string; link: string }> = {
  loading: { body: CHECKING_MESSAGE, link: 'View subscription' },
  web: { body: WEB_MESSAGE, link: 'View subscription' },
  unknown: { body: UNKNOWN_MESSAGE, link: 'View subscription' },
  unsubscribed: { body: UNSUBSCRIBED_MESSAGE, link: 'Upgrade to Pro' },
  subscribed: { body: SUBSCRIBED_MESSAGE, link: 'Manage subscription' },
}

interface SubscriptionCardProps {
  userId: string
}

export default function SubscriptionCard({ userId }: SubscriptionCardProps) {
  const [status, setStatus] = useState<SubscriptionStatus>('loading')

  useEffect(() => {
    let cancelled = false

    async function checkSubscription() {
      try {
        const init = await initRevenueCat(userId)
        if (cancelled) return

        if (
          !init.available &&
          (init.reason === 'not-native' || init.reason === 'missing-key')
        ) {
          setStatus('web')
          return
        }

        // A blank id must not be treated as subscribed. init can still
        // report available when a previous native session is configured.
        if (userId === '' || !init.available) {
          setStatus('unknown')
          return
        }

        const info = await getCustomerInfo()
        if (cancelled) return

        // proActive is summarizeEntitlements' activeEntitlements.includes('pro').
        // allEntitlements is not a subscription.
        if (info.available && info.entitlements.proActive) {
          setStatus('subscribed')
          return
        }
        if (info.available && !info.entitlements.proActive) {
          setStatus('unsubscribed')
          return
        }
        setStatus('unknown')
      } catch {
        if (!cancelled) setStatus('unknown')
      }
    }

    void checkSubscription()

    return () => {
      cancelled = true
    }
  }, [userId])

  const { body, link } = COPY[status]

  return (
    <div
      aria-busy={status === 'loading'}
      className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-xl font-semibold text-gray-900">Subscription</h2>
      {status === 'subscribed' ? (
        <p role="status" className="mt-2 text-gray-700">
          {body}
        </p>
      ) : (
        <p className="mt-2 text-gray-700">{body}</p>
      )}
      <Link
        href="/paywall"
        className="mt-4 inline-block font-medium text-blue-600 hover:text-blue-500"
      >
        {link}
      </Link>
    </div>
  )
}
