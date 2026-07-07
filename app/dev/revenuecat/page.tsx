// SPIKE ARTIFACT — temporary internal diagnostics route.
// Not linked from any user-facing navigation. Not a paywall.
// See docs/REVENUECAT_SPIKE.md for context and removal plan.

import { notFound } from 'next/navigation'
import Diagnostics from './Diagnostics'

export const metadata = {
  title: 'RevenueCat Diagnostics (internal)',
  robots: 'noindex, nofollow',
}

// This route is a temporary spike artifact. Because the iOS shell runs in
// live-server mode against the production Vercel deployment, NODE_ENV is
// 'production' even during a legitimate device spike — so we gate on an
// explicit opt-in flag instead of NODE_ENV. The route 404s unless the
// operator sets NEXT_PUBLIC_ENABLE_RC_DIAGNOSTICS=true in the environment
// (Vercel) for the duration of the device test, then removes it. This keeps
// the diagnostics page unreachable by default in production while still
// allowing the on-device spike run.
export default function RevenueCatDevPage() {
  if (process.env.NEXT_PUBLIC_ENABLE_RC_DIAGNOSTICS !== 'true') {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <p className="font-semibold">INTERNAL DIAGNOSTICS — not a paywall</p>
          <p className="mt-1 text-sm">
            This is a temporary spike artifact for validating the RevenueCat
            Capacitor SDK bridge on a real iOS device. It is not linked from
            any app navigation and is not part of the subscription product.
            Safe to delete once the device spike is complete.
          </p>
        </div>

        <Diagnostics />
      </div>
    </div>
  )
}
