'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'
import { FiscusLogo } from '@/components/FiscusLogo'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Something went wrong')
      }

      setSent(true)
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
        <div className="mb-8">
          <FiscusLogo />
        </div>

        {sent ? (
          /* Success state */
          <div className="rounded-2xl p-8 flex flex-col items-center gap-4 text-center"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
              <CheckCircle size={32} color="var(--green)" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="font-serif text-[20px] font-semibold mb-2">Check your inbox</h1>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                If an account exists for <strong style={{ color: 'var(--text)' }}>{email}</strong>, we've sent a reset link. It expires in 1 hour.
              </p>
            </div>
            <Link href="/login"
              className="w-full py-3 rounded-xl text-[13px] font-bold text-center mt-2"
              style={{ background: 'var(--gold)', color: '#07091a', boxShadow: '0 4px 20px rgba(212,168,67,0.25)', display: 'block' }}>
              Back to Sign In
            </Link>
          </div>
        ) : (
          /* Form state */
          <div className="rounded-2xl p-8" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
            <h1 className="font-serif text-[22px] font-semibold mb-1">Forgot password?</h1>
            <p className="text-[13px] mb-6" style={{ color: 'var(--text-muted)' }}>
              Enter your email and we'll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-semibold mb-1.5 tracking-wider uppercase"
                  style={{ color: 'var(--text-muted)' }}>
                  Email address
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl text-[13px] outline-none transition-all"
                    style={{
                      background: 'var(--bg-3)',
                      border: '1px solid var(--line)',
                      color: 'var(--text)',
                    }}
                  />
                </div>
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
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>

            <div className="flex items-center justify-center gap-1 mt-5">
              <ArrowLeft size={13} style={{ color: 'var(--text-muted)' }} />
              <Link href="/login" className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                Back to sign in
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
