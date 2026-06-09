'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Zap } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Invalid email or password')
    } else {
      router.push('/feed')
      router.refresh()
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
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
          <h1 className="font-serif text-[20px] font-semibold text-center">Welcome back</h1>

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
                className="w-full px-3.5 py-3 rounded-xl text-[13px] outline-none transition-all"
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
                  autoComplete="current-password"
                  className="w-full px-3.5 py-3 rounded-xl text-[13px] outline-none transition-all pr-10"
                  style={{
                    background: 'var(--bg-3)',
                    border: '1px solid var(--line-2)',
                    color: 'var(--text-primary)',
                  }}
                  placeholder="••••••••"
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
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-[13px] mt-4" style={{ color: 'var(--text-muted)' }}>
          No account?{' '}
          <Link href="/signup" className="font-semibold" style={{ color: 'var(--gold)' }}>
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
