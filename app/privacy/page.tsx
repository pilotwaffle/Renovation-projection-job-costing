import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — RenoMargin',
  description: 'How RenoMargin collects, uses, and protects your data.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10">
          <p className="text-sm font-semibold text-blue-600">RenoMargin</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Effective date: July 12, 2026
          </p>
        </header>

        <div className="space-y-8 text-gray-600">
          <section>
            <p>
              RenoMargin is a job-costing app for renovation contractors,
              operated by an independent developer. This policy describes what
              data the app collects, why, and what happens to it. The short
              version: we collect only what the app needs to work, and{' '}
              <strong className="text-gray-900">
                your financial data is encrypted, isolated to your account,
                never sold, never used to train anything, and exportable the
                day you want it.
              </strong>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              Data we collect
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                <strong className="text-gray-900">
                  Email and contact info:
                </strong>{' '}
                your email address and password (stored as a secure hash), used
                solely to create and sign in to your account.
              </li>
              <li>
                <strong className="text-gray-900">User content:</strong> the
                data you enter or upload while using the app — jobs, budgets
                and other job financials, scope items, change orders, templates,
                and photos.
              </li>
            </ul>
            <p className="mt-3">
              That is the complete list. We do not collect device identifiers,
              location data, contacts, or browsing history.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              How we use your data
            </h2>
            <p className="mt-3">
              For app functionality only: authenticating you, storing and
              displaying your jobs and costs, computing dashboards and variance
              alerts, generating your reports and exports, and sending you the
              notifications you enable. We do not use your data for
              advertising, profiling, or training AI models, and we never sell
              it or share it with data brokers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              No tracking, no ads
            </h2>
            <p className="mt-3">
              RenoMargin contains no third-party advertising, no ad networks,
              no tracking pixels, and no third-party analytics SDKs. We do not
              track you across other apps or websites.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              Where your data is stored
            </h2>
            <p className="mt-3">
              Your data is stored and processed by two infrastructure
              providers, acting on our behalf:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>
                <strong className="text-gray-900">Supabase</strong> — database,
                authentication, and file storage. Data is encrypted in transit
                and at rest, and row-level security isolates your records to
                your account.
              </li>
              <li>
                <strong className="text-gray-900">Vercel</strong> — application
                hosting.
              </li>
            </ul>
            <p className="mt-3">
              These providers process data only to run the service; they do not
              use it for their own purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">Photos</h2>
            <p className="mt-3">
              Photos you attach to scope items are uploaded by you and stored
              in private storage tied to your account. They are not public, not
              shared with other users, and are only accessible through your
              authenticated session.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              Data retention
            </h2>
            <p className="mt-3">
              We keep your data for as long as your account exists, so the app
              can do its job. When you delete your account, your data —
              including your photos — is permanently deleted, not archived or
              deactivated. You can export your data (CSV) at any time before
              deleting; your data is never locked in.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              Deleting your account
            </h2>
            <p className="mt-3">
              You can delete your account from inside the app at any time:{' '}
              <strong className="text-gray-900">
                Settings → Account → Delete account
              </strong>
              . This is a hard delete — your account, jobs, financials, scope
              items, and photos are permanently removed. This action cannot be
              undone.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              Changes to this policy
            </h2>
            <p className="mt-3">
              If this policy changes, we will update this page and its
              effective date. Material changes will be communicated in the app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">Contact</h2>
            <p className="mt-3">
              Questions about privacy or your data? Email{' '}
              <a
                href="mailto:admin@torqbusinesssolutions.com"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                admin@torqbusinesssolutions.com
              </a>{' '}
              or visit the{' '}
              <Link
                href="/support"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                support page
              </Link>
              .
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
