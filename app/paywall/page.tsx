import Link from 'next/link'
import type { Metadata } from 'next'
import PaywallPurchase from './PaywallPurchase'

export const metadata: Metadata = {
  title: 'Subscribe — RenoMargin',
  description: 'Subscribe to RenoMargin Pro.',
}

export default function PaywallPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-md">
        <header className="mb-8 text-center">
          <p className="text-sm font-semibold text-blue-600">RenoMargin</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            RenoMargin Pro
          </h1>
          <p className="mt-2 text-gray-600">
            Everything you need to protect your margin on every job.
          </p>
        </header>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <ul className="space-y-2 text-gray-700">
            <li>Unlimited jobs</li>
            <li>Full photos and annotations</li>
            <li>Change orders and scheduling</li>
            <li>CSV import and export</li>
            <li>Smart variance alerts</li>
            <li>Advanced reports</li>
          </ul>

          <PaywallPurchase />

          <p className="mt-4 text-center text-sm text-gray-600">
            <Link
              href="/privacy"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Privacy Policy
            </Link>
            {' · '}
            <Link
              href="/terms"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Terms of Use
            </Link>
          </p>
        </div>

        <footer className="mt-10 text-center text-sm">
          <Link
            href="/support"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Need help? Visit Support
          </Link>
        </footer>
      </div>
    </div>
  )
}
