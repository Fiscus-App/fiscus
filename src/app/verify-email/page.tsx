'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { Zap, CheckCircle, XCircle, Mail } from 'lucide-react'

function VerifyContent() {
  const params  = useSearchParams()
  const success = params.get('success') === '1'
  const error   = params.get('error')

  const state = success
    ? {
        icon: <CheckCircle size={40} style={{ color: 'var(--green)' }} strokeWidth={1.5} />,
        title: 'Email verified!',
        body: "You're all set. Your Fiscus account is now fully active.",
        cta: { href: '/feed', label: 'Go to Feed' },
        color: 'var(--green)',
      }
    : error === 'expired'
    ? {
        icon: <XCircle size={40} style={{ color: 'var(--amber)' }} strokeWidth={1.5} />,
        title: 'Link expired',
        body: 'This verification link has expired. Sign in and we can send you a new one.',
        cta: { href: '/login', label: 'Sign In' },
        color: 'var(--amber)',
      }
    : error
    ? {
        icon: <XCircle size={40} style={{ color: 'var(--red)' }} strokeWidth={1.5} />,
        title: 'Invalid link',
        body: "This verification link isn't valid. It may have already been used.",
        cta: { href: '/login', label: 'Sign In' },
        color: 'var(--red)',
      }
    : {
        icon: <Mail size={40} style={{ color: 'var(--gold)' }} strokeWidth={1.5} />,
        title: 'Check your email',
        body: "We've sent a verification link to your inbox. Click it to activate your account.",
        cta: { href: '/feed', label: 'Continue to Feed' },
        color: 'var(--gold)',
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

        {/* Card */}
        <div className="rounded-2xl p-8 flex flex-col items-center gap-4 text-center"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>

          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: `${state.color}18`, border: `1px solid ${state.color}40` }}>
            {state.icon}
          </div>

          <div>
            <h1 className="font-serif text-[20px] font-semibold mb-2">{state.title}</h1>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {state.body}
            </p>
          </div>

          <Link href={state.cta.href}
            className="w-full py-3 rounded-xl text-[13px] font-bold text-center mt-2"
            style={{ background: 'var(--gold)', color: '#07091a', boxShadow: '0 4px 20px rgba(212,168,67,0.25)', display: 'block' }}>
            {state.cta.label}
          </Link>
        </div>

      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyContent />
    </Suspense>
  )
}
