const KNOWN_ERRORS: Record<string, string> = {
  'Invalid credentials': 'Incorrect email or password. Please try again.',
  'Could not create account': 'We could not create your account. Please try again.',
}

const GENERIC_ERROR = 'Something went wrong. Please try again.'

interface AuthErrorBannerProps {
  error?: string
}

export default function AuthErrorBanner({ error }: AuthErrorBannerProps) {
  if (!error) {
    return null
  }

  const message = KNOWN_ERRORS[error] ?? GENERIC_ERROR

  return (
    <div
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      {message}
    </div>
  )
}
