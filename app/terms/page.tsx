import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — RenoMargin',
  description: 'The terms that govern your use of RenoMargin.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10">
          <p className="text-sm font-semibold text-blue-600">RenoMargin</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Effective date: July 12, 2026
          </p>
        </header>

        <div className="space-y-8 text-gray-600">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              1. The service
            </h2>
            <p className="mt-3">
              RenoMargin is a job-costing app for renovation contractors: track
              estimated vs. actual costs, monitor budget variance, manage scope
              items and change orders, and generate budget reports. By creating
              an account or using the app, you agree to these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              2. Your account
            </h2>
            <p className="mt-3">
              You are responsible for keeping your login credentials secure and
              for all activity under your account. You must provide accurate
              information and be legally able to enter into these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              3. Acceptable use
            </h2>
            <p className="mt-3">You agree not to:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>use the service for any unlawful purpose;</li>
              <li>
                attempt to access another user&apos;s account or data, or probe,
                scan, or test the vulnerability of the service;
              </li>
              <li>
                interfere with or disrupt the service, or impose an unreasonable
                load on its infrastructure;
              </li>
              <li>
                upload content that is illegal, infringing, or malicious
                (including malware).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              4. Your content
            </h2>
            <p className="mt-3">
              You own your data. The jobs, financials, scope items, photos, and
              other content you add to RenoMargin remain yours. You grant us
              only the limited rights needed to store, process, and display
              that content back to you — that is, to run the service. You can
              export your data at any time, and it is handled as described in
              our{' '}
              <Link
                href="/privacy"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              5. Subscriptions
            </h2>
            <p className="mt-3">
              Some features may require a paid subscription. On iOS, billing is
              handled by Apple through your App Store account, and Apple&apos;s
              terms govern payment, renewal, and cancellation. Current pricing
              and plan details are shown in the app before you purchase.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              6. Disclaimer of warranties
            </h2>
            <p className="mt-3">
              The service is provided &quot;as is&quot; and &quot;as
              available,&quot; without warranties of any kind, express or
              implied, including fitness for a particular purpose and
              non-infringement. RenoMargin is a record-keeping and analysis
              tool; it does not provide accounting, tax, or professional
              advice, and you remain responsible for your business decisions
              and the accuracy of the data you enter.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              7. Limitation of liability
            </h2>
            <p className="mt-3">
              To the maximum extent permitted by law, RenoMargin and its
              developer will not be liable for any indirect, incidental,
              special, consequential, or punitive damages, or for lost profits,
              revenues, or data, arising from your use of the service. Our
              total liability for any claim is limited to the amount you paid
              for the service in the twelve months before the claim arose.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              8. Termination
            </h2>
            <p className="mt-3">
              You can stop using the service at any time and delete your
              account in the app (Settings → Account → Delete account). We may
              suspend or terminate accounts that violate these terms. On
              termination, your data is deleted as described in the Privacy
              Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              9. Changes to these terms
            </h2>
            <p className="mt-3">
              We may update these terms from time to time. We will update the
              effective date above, and material changes will be communicated
              in the app. Continued use after changes take effect constitutes
              acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">10. Contact</h2>
            <p className="mt-3">
              Questions about these terms? Email{' '}
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
