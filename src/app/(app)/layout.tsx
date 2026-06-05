'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TickerTape } from '@/components/markets/TickerTape'
import clsx from 'clsx'

const NAV_ITEMS = [
  { href: '/feed', icon: '▶', label: 'Feed' },
  { href: '/markets', icon: '◻', label: 'Markets' },
  { href: '/teams', icon: '◎', label: 'Teams' },
  { href: '/saved', icon: '◈', label: 'Saved' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <div
      className="flex flex-col"
      style={{ height: '100dvh', background: 'var(--bg)', overflow: 'hidden' }}
    >
      {/* Header */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-4"
        style={{ height: 44, background: 'var(--bg-2)', borderBottom: '1px solid var(--line)' }}
      >
        <div className="flex items-center gap-2">
          <Link href="/feed" className="flex items-center gap-2 no-underline">
            <span className="font-serif text-lg font-medium" style={{ color: 'var(--gold)' }}>
              Fiscus
            </span>
            <span
              className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded"
              style={{ background: 'var(--gold)', color: '#08050a' }}
            >
              BETA
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 font-mono text-[10px] tracking-widest" style={{ color: 'var(--text-muted)' }}>
            <span
              className="live-dot inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--green)' }}
            />
            LIVE
          </div>

          {/* Search */}
          <Link
            href="/feed?search=1"
            className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-sm"
            style={{ background: 'var(--bg-3)', border: '1px solid var(--line-2)', color: 'var(--text-muted)' }}
          >
            🔍
          </Link>

          {/* Notifications */}
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative w-[30px] h-[30px] rounded-full flex items-center justify-center text-sm"
            style={{ background: 'var(--bg-3)', border: '1px solid var(--line-2)' }}
          >
            🔔
            <span
              className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold"
              style={{ background: 'var(--red)', color: '#fff', border: '1.5px solid var(--bg-2)' }}
            >
              3
            </span>
          </button>

          {/* Avatar */}
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

      {/* Ticker tape */}
      <TickerTape />

      {/* Page content */}
      <main className="flex-1 overflow-hidden">{children}</main>

      {/* Bottom navigation */}
      <nav
        className="flex-shrink-0 flex"
        style={{ height: 54, background: 'var(--bg-2)', borderTop: '1px solid var(--line)' }}
      >
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex-1 flex flex-col items-center justify-center gap-0.5 no-underline',
                'text-[9.5px] font-bold uppercase tracking-wider font-sans transition-colors',
              )}
              style={{ color: active ? 'var(--gold)' : 'var(--text-muted)' }}
            >
              <span className="text-[18px] leading-none">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
