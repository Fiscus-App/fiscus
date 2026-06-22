'use client'

import { useState, useEffect } from 'react'
import { signIn, getProviders } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Check } from 'lucide-react'
import { FiscusLogo } from '@/components/FiscusLogo'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName]                 = useState('')
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [googleEnabled, setGoogleEnabled] = useState(false)

  useEffect(() => {
    getProviders().then(p => setGoogleEnabled(Boolean(p?.google))).catch(() => {})
  }, [])

  const passwordStrength = password.length === 0 ? 0
    : password.length < 8 ? 1
    : password.length < 12 ? 2
    : 3

  const strengthLabel = ['', 'Weak', 'Good', 'Strong']
  const strengthColor = ['', 'var(--red)', 'var(--amber)', 'var(--green)']

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        setLoading(false)
        return
      }

      // Auto sign in after signup
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      setLoading(false)

      if (result?.error) {
        setError('Account created but sign in failed. Try logging in.')
      } else {
        router.push('/feed')
        router.refresh()
      }
    } catch {
      setLoading(false)
      setError('Something went wrong. Please try again.')
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: 'var(--bg)' }}
    >
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="mb-8">
          <FiscusLogo showTagline />
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 space-y-4"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
        >
          <h1 className="font-serif text-[20px] font-semibold text-center">Create account</h1>

          {/* Beta badge */}
          <div className="flex justify-center">
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
              style={{ background: 'var(--gold-a)', border: '1px solid var(--gold-c)', color: 'var(--gold)' }}
            >
              <Check size={10} strokeWidth={3} />
              Free during beta
            </div>
          </div>

          {error && (
            <div
              className="px-3 py-2.5 rounded-xl text-[13px]"
              style={{
                background: 'rgba(255,82,82,0.08)',
                border: '1px solid rgba(255,82,82,0.25)',
                color: 'var(--red)',
              }}
            >
              {error}
            </div>
          )}

          {/* Google — shown only when the provider is configured */}
          {googleEnabled && (
            <>
              <button
                type="button"
                onClick={() => signIn('google', { callbackUrl: '/feed' })}
                className="w-full py-3 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2.5 transition-opacity"
                style={{
                  background: 'var(--bg-3)',
                  border: '1px solid var(--line-2)',
                  color: 'var(--text-primary)',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
                <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>or</span>
                <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Name */}
            <div>
              <label
                className="block text-[10px] font-bold uppercase tracking-widest mb-1.5"
                style={{ color: 'var(--text-muted)' }}
              >
                Full name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoComplete="name"
                className="w-full px-3.5 py-3 rounded-xl text-[13px] outline-none"
                style={{
                  background: 'var(--bg-3)',
                  border: '1px solid var(--line-2)',
                  color: 'var(--text-primary)',
                }}
                placeholder="Jane Smith"
              />
            </div>

            {/* Email */}
            <div>
              <label
                className="block text-[10px] font-bold uppercase tracking-widest mb-1.5"
                style={{ color: 'var(--text-muted)' }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3.5 py-3 rounded-xl text-[13px] outline-none"
                style={{
                  background: 'var(--bg-3)',
                  border: '1px solid var(--line-2)',
                  color: 'var(--text-primary)',
                }}
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label
                className="block text-[10px] font-bold uppercase tracking-widest mb-1.5"
                style={{ color: 'var(--text-muted)' }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full px-3.5 py-3 rounded-xl text-[13px] outline-none pr-10"
                  style={{
                    background: 'var(--bg-3)',
                    border: '1px solid var(--line-2)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(o => !o)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {/* Strength bar */}
              {password.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3].map(i => (
                      <div
                        key={i}
                        className="h-1 flex-1 rounded-full transition-all"
                        style={{
                          background: i <= passwordStrength
                            ? strengthColor[passwordStrength]
                            : 'var(--line-2)',
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-semibold" style={{ color: strengthColor[passwordStrength] }}>
                    {strengthLabel[passwordStrength]}
                  </span>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-[13px] font-bold transition-opacity mt-1"
              style={{
                background: 'var(--gold)',
                color: '#07091a',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 4px 20px rgba(212,168,67,0.25)',
              }}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p
            className="text-[11px] text-center leading-relaxed"
            style={{ color: 'var(--text-muted)' }}
          >
            By creating an account you agree to our{' '}
            <span style={{ color: 'var(--text-secondary)' }}>Terms of Service</span>
            {' '}and{' '}
            <span style={{ color: 'var(--text-secondary)' }}>Privacy Policy</span>.
            <br />
            Fiscus is a financial news service — not financial advice.
          </p>
        </div>

        <p className="text-center text-[13px] mt-4" style={{ color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link href="/login" className="font-semibold" style={{ color: 'var(--gold)' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
