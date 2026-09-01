import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../../../services/api'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'pending'>('pending')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      setStatus('loading')
      api.post('/auth/verify-email', { token })
        .then(() => {
          setStatus('success')
        })
        .catch((err) => {
          setStatus('error')
          if (err && typeof err === 'object' && 'response' in err) {
            const axiosError = err as { response?: { data?: { error?: string } } }
            setError(axiosError.response?.data?.error || 'Verification failed')
          } else {
            setError('An unexpected error occurred')
          }
        })
    }
  }, [token])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="rounded-xl bg-white p-8 shadow-lg">
            <div className="mb-4 text-4xl">📧</div>
            <h1 className="text-2xl font-bold text-secondary-900">Verifying Email...</h1>
            <p className="mt-2 text-sm text-secondary-500">Please wait while we verify your email.</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="rounded-xl bg-white p-8 shadow-lg">
            <div className="mb-4 text-4xl">✅</div>
            <h1 className="text-2xl font-bold text-secondary-900">Email Verified!</h1>
            <p className="mt-2 text-sm text-secondary-500">
              Your email has been verified successfully.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-block rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="rounded-xl bg-white p-8 shadow-lg">
            <div className="mb-4 text-4xl">❌</div>
            <h1 className="text-2xl font-bold text-secondary-900">Verification Failed</h1>
            <p className="mt-2 text-sm text-secondary-500">{error}</p>
            <Link
              to="/login"
              className="mt-6 inline-block rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Pending state - show when page loads without token
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="rounded-xl bg-white p-8 shadow-lg">
          <div className="mb-4 text-4xl">📧</div>
          <h1 className="text-2xl font-bold text-secondary-900">Check Your Email</h1>
          <p className="mt-2 text-sm text-secondary-500">
            We've sent a verification link to your email address. Please check your inbox and click
            the link to verify your account.
          </p>
          <p className="mt-4 text-xs text-secondary-400">
            Didn't receive the email? Check your spam folder or contact support.
          </p>
        </div>
      </div>
    </div>
  )
}
