'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Zap, Check } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName]                 = useState('')
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')

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
        <div className="flex flex-col items-center gap-2 mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: 'var(--gold-a)',
              border: '1px solid var(--gold-c)',
              boxShadow: '0 0 30px rgba(212,168,67,0.15)',
            }}
          >
            <Zap size={26} style={{ color: 'var(--gold)' }} strokeWidth={2} />
          </div>
          <span className="font-serif text-2xl font-semibold" style={{ color: 'var(--gold)' }}>
            Fiscus
          </span>
          <span className="text-[12px] font-mono tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Australian Financial Intelligence
          </span>
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
