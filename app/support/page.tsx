import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support — RenoMargin',
  description: 'Get help with RenoMargin: FAQs and contact information.',
}

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10">
          <p className="text-sm font-semibold text-blue-600">RenoMargin</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">Support</h1>
          <p className="mt-2 text-gray-600">
            Help with RenoMargin — job costing for renovation contractors.
          </p>
        </header>

        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              Frequently asked questions
            </h2>

            <div className="mt-4 space-y-6">
              <div className="rounded-lg border border-gray-200 bg-white p-5">
                <h3 className="font-semibold text-gray-900">
                  I can&apos;t log in — what should I check?
                </h3>
                <p className="mt-2 text-gray-600">
                  Make sure you&apos;re using the email address you signed up
                  with, and check for typos in your password. If it still
                  fails, wait a minute and try again — then contact us at the
                  email below with the address on your account (never send your
                  password), and we&apos;ll help you get back in.
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-5">
                <h3 className="font-semibold text-gray-900">
                  How do I delete my account?
                </h3>
                <p className="mt-2 text-gray-600">
                  In the app, go to{' '}
                  <strong className="text-gray-900">
                    Settings → Account → Delete account
                  </strong>
                  . This permanently deletes your account and all of your data
                  — jobs, financials, scope items, and photos. It cannot be
                  undone, so export anything you want to keep first.
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-5">
                <h3 className="font-semibold text-gray-900">
                  How are my photos stored?
                </h3>
                <p className="mt-2 text-gray-600">
                  Photos you attach to scope items are stored in private,
                  account-isolated storage. They&apos;re only visible to you
                  through your login, are never public, and are permanently
                  deleted when you delete your account. See the{' '}
                  <Link
                    href="/privacy"
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    Privacy Policy
                  </Link>{' '}
                  for details.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">Contact us</h2>
            <p className="mt-3 text-gray-600">
              Didn&apos;t find your answer? Email{' '}
              <a
                href="mailto:notifications@renovation-job-costing.com"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                notifications@renovation-job-costing.com
              </a>{' '}
              and include a short description of the problem and the email
              address on your account. We aim to reply within a few business
              days.
            </p>
          </section>

          <section className="text-sm text-gray-500">
            <p>
              See also:{' '}
              <Link
                href="/privacy"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Privacy Policy
              </Link>{' '}
              ·{' '}
              <Link
                href="/terms"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Terms of Service
              </Link>
            </p>
          </section>
        </div>

        <footer className="mt-12 border-t border-gray-200 pt-6 text-sm">
          <Link
            href="/"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            ← Back to RenoMargin
          </Link>
        </footer>
      </div>
    </div>
  )
}
