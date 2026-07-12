import { signup } from '../login/actions'
import Image from 'next/image'
import AuthErrorBanner from '../AuthErrorBanner'
import SubmitButton from '../SubmitButton'

interface SignupPageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { error } = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mb-6">
            <Image
              src="/logo.png"
              alt="RenoMargin Logo"
              width={64}
              height={64}
              className="mx-auto"
            />
            <h1 className="mt-4 text-2xl font-bold text-gray-900">RenoMargin</h1>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </a>
          </p>
        </div>
        <AuthErrorBanner error={error} />
        <form className="mt-8 space-y-6">
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm"
                placeholder="Password (min 6 characters)"
              />
            </div>
          </div>

          <div>
            <SubmitButton formAction={signup} idleLabel="Sign up" pendingLabel="Creating account…" />
          </div>
        </form>
      </div>
    </div>
  )
}