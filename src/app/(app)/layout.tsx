'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TickerTape } from '@/components/markets/TickerTape'
import { Zap, TrendingUp, Users, Bookmark, Search, Bell } from 'lucide-react'
import clsx from 'clsx'

const NAV_ITEMS = [
  { href: '/feed', Icon: Zap, label: 'Feed' },
  { href: '/markets', Icon: TrendingUp, label: 'Markets' },
  { href: '/teams', Icon: Users, label: 'Teams' },
  { href: '/saved', Icon: Bookmark, label: 'Saved' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [_notifOpen, setNotifOpen] = useState(false)

  return (
    <div
      className="flex flex-col"
      style={{ height: '100dvh', background: 'var(--bg)', overflow: 'hidden' }}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-4"
        style={{
          height: 48,
          background: 'rgba(13,18,34,0.97)',
          borderBottom: '1px solid var(--line)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {/* Logo */}
        <Link href="/feed" className="flex items-center gap-2 no-underline">
          <span className="font-serif text-xl font-semibold" style={{ color: 'var(--gold)' }}>
            Fiscus
          </span>
          <span
            className="text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded"
            style={{ background: 'var(--gold)', color: '#07091a', letterSpacing: '0.15em' }}
          >
            BETA
          </span>
        </Link>

        {/* Right controls */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest"
            style={{ color: 'var(--text-muted)' }}
          >
            <span
              className="live-dot inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: 'var(--green)' }}
            />
            LIVE
          </div>

          <Link
            href="/feed?search=1"
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: 'var(--bg-3)',
              border: '1px solid var(--line-2)',
              color: 'var(--text-muted)',
            }}
          >
            <Search size={14} strokeWidth={2} />
          </Link>

          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="relative w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: 'var(--bg-3)',
              border: '1px solid var(--line-2)',
              color: 'var(--text-muted)',
            }}
          >
            <Bell size={14} strokeWidth={2} />
            <span
              className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold"
              style={{ background: 'var(--red)', color: '#fff', border: '1.5px solid var(--bg-2)' }}
            >
              3
            </span>
          </button>

          <Link
            href="/profile"
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
            style={{
              background: 'var(--gold-a)',
              border: '1px solid var(--gold-c)',
              color: 'var(--gold)',
            }}
          >
            B
          </Link>
        </div>
      </header>

      {/* ── Ticker tape ──────────────────────────────────────────── */}
      <TickerTape />

      {/* ── Page content ─────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden">{children}</main>

      {/* ── Bottom nav ───────────────────────────────────────────── */}
      <nav
        className="flex-shrink-0 flex"
        style={{
          height: 58,
          background: 'rgba(13,18,34,0.97)',
          borderTop: '1px solid var(--line)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        {NAV_ITEMS.map(({ href, Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex-1 flex flex-col items-center justify-center gap-1 no-underline',
                'text-[9.5px] font-bold uppercase tracking-wider font-sans',
              )}
              style={{ color: active ? 'var(--gold)' : 'var(--text-muted)', transition: 'color 0.2s' }}
            >
              <Icon
                size={active ? 22 : 20}
                strokeWidth={active ? 2.5 : 1.8}
                style={{
                  filter: active ? 'drop-shadow(0 0 7px rgba(212,168,67,0.55))' : 'none',
                  transition: 'all 0.2s ease',
                }}
              />
              {label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
