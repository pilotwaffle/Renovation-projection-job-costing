import Link from 'next/link'

export default function GoodbyePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Your account has been deleted
        </h1>
        <p className="mt-4 text-gray-600">
          All of your data has been permanently removed. We&apos;re sorry to
          see you go.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
        >
          Return to login
        </Link>
      </div>
    </div>
  )
}
