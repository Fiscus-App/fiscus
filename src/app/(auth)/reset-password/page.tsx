'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, Eye, EyeOff, CheckCircle } from 'lucide-react'

function ResetPasswordContent() {
  const params   = useSearchParams()
  const router   = useRouter()
  const token    = params.get('token') ?? ''

  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [done, setDone]           = useState(false)
  const [error, setError]         = useState('')

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <p style={{ color: 'var(--text-muted)' }} className="mb-4">Invalid reset link.</p>
          <Link href="/forgot-password" style={{ color: 'var(--gold)' }} className="text-[13px]">
            Request a new one
          </Link>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Something went wrong')

      setDone(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--gold-a)', border: '1px solid var(--gold-c)', boxShadow: '0 0 30px rgba(212,168,67,0.15)' }}>
            <Zap size={26} style={{ color: 'var(--gold)' }} strokeWidth={2} />
          </div>
          <span className="font-serif text-2xl font-semibold" style={{ color: 'var(--gold)' }}>Fiscus</span>
        </div>

        {done ? (
          <div className="rounded-2xl p-8 flex flex-col items-center gap-4 text-center"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
              <CheckCircle size={32} color="var(--green)" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="font-serif text-[20px] font-semibold mb-2">Password updated!</h1>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Redirecting you to sign in…
              </p>
            </div>
            <Link href="/login"
              className="w-full py-3 rounded-xl text-[13px] font-bold text-center"
              style={{ background: 'var(--gold)', color: '#07091a', display: 'block' }}>
              Sign In Now
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl p-8" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
            <h1 className="font-serif text-[22px] font-semibold mb-1">Set new password</h1>
            <p className="text-[13px] mb-6" style={{ color: 'var(--text-muted)' }}>
              Choose a strong password for your Fiscus account.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* New password */}
              <div>
                <label className="block text-[11px] font-semibold mb-1.5 tracking-wider uppercase"
                  style={{ color: 'var(--text-muted)' }}>
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl text-[13px] outline-none transition-all"
                    style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', color: 'var(--text)' }}
                  />
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-muted)' }}>
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Confirm */}
              <div>
                <label className="block text-[11px] font-semibold mb-1.5 tracking-wider uppercase"
                  style={{ color: 'var(--text-muted)' }}>
                  Confirm password
                </label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  required
                  className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none transition-all"
                  style={{ background: 'var(--bg-3)', border: '1px solid var(--line)', color: 'var(--text)' }}
                />
              </div>

              {error && (
                <p className="text-[12px] text-center" style={{ color: 'var(--red)' }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-[13px] font-bold transition-all mt-1"
                style={{
                  background: 'var(--gold)',
                  color: '#07091a',
                  boxShadow: '0 4px 20px rgba(212,168,67,0.25)',
                  opacity: loading ? 0.7 : 1,
                }}>
                {loading ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  )
}
