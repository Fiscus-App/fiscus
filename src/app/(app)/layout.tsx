'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TickerTape } from '@/components/markets/TickerTape'
import { Zap, TrendingUp, Users, Bookmark, Search, Bell } from 'lucide-react'
import clsx from 'clsx'

const NAV_ITEMS = [
  { href: '/feed',    Icon: Zap,         label: 'Feed'    },
  { href: '/markets', Icon: TrendingUp,  label: 'Markets' },
  { href: '/teams',   Icon: Users,       label: 'Teams'   },
  { href: '/saved',   Icon: Bookmark,    label: 'Saved'   },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [_notif, setNotif] = useState(false)
  const isFeed = pathname.startsWith('/feed')

  return (
    <div className="flex flex-col" style={{ height: '100dvh', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-4 z-30"
        style={{
          height: 48,
          background: isFeed ? 'transparent' : 'rgba(13,18,34,0.97)',
          borderBottom: isFeed ? 'none' : '1px solid var(--line)',
          backdropFilter: isFeed ? 'none' : 'blur(16px)',
          WebkitBackdropFilter: isFeed ? 'none' : 'blur(16px)',
          position: isFeed ? 'absolute' : 'relative',
          top: 0, left: 0, right: 0,
        }}
      >
        <Link href="/feed" className="flex items-center gap-2 no-underline">
          <span className="font-serif text-xl font-semibold" style={{ color: 'var(--gold)', textShadow: isFeed ? '0 1px 8px rgba(0,0,0,0.8)' : 'none' }}>
            Fiscus
          </span>
          <span className="text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded"
            style={{ background: 'var(--gold)', color: '#07091a', letterSpacing: '0.15em' }}>
            BETA
          </span>
        </Link>

        <div className="flex items-center gap-2.5">
          {!isFeed && (
            <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest" style={{ color: 'var(--text-muted)' }}>
              <span className="live-dot inline-block w-1.5 h-1.5 rounded-full" style={{ background: '#2ed494' }} />
              LIVE
            </div>
          )}

          <Link href="/feed?search=1"
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: isFeed ? 'rgba(255,255,255,0.1)' : 'var(--bg-3)',
              border: `1px solid ${isFeed ? 'rgba(255,255,255,0.18)' : 'var(--line-2)'}`,
              color: isFeed ? 'white' : 'var(--text-muted)',
              backdropFilter: isFeed ? 'blur(8px)' : 'none',
            }}>
            <Search size={14} strokeWidth={2} />
          </Link>

          <button onClick={() => setNotif((o) => !o)}
            className="relative w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: isFeed ? 'rgba(255,255,255,0.1)' : 'var(--bg-3)',
              border: `1px solid ${isFeed ? 'rgba(255,255,255,0.18)' : 'var(--line-2)'}`,
              color: isFeed ? 'white' : 'var(--text-muted)',
              backdropFilter: isFeed ? 'blur(8px)' : 'none',
            }}>
            <Bell size={14} strokeWidth={2} />
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold"
              style={{ background: 'var(--red)', color: '#fff', border: '1.5px solid var(--bg-2)' }}>
              3
            </span>
          </button>

          <Link href="/profile"
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
            style={{ background: 'var(--gold-a)', border: '1px solid var(--gold-c)', color: 'var(--gold)' }}>
            B
          </Link>
        </div>
      </header>

      {/* ── Ticker tape (non-feed pages only) ─────────────────────────── */}
      {!isFeed && <TickerTape />}

      {/* ── Page content ──────────────────────────────────────────────── */}
      <main className={clsx('flex-1 overflow-hidden', isFeed && 'relative')}
        style={{ marginTop: isFeed ? -48 : 0 }}>
        {children}
      </main>

      {/* ── Bottom nav ────────────────────────────────────────────────── */}
      <nav
        className="flex-shrink-0 flex z-30"
        style={{
          height: 58,
          background: isFeed ? 'rgba(7,9,26,0.82)' : 'rgba(13,18,34,0.97)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {NAV_ITEMS.map(({ href, Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className="flex-1 flex flex-col items-center justify-center gap-1 no-underline"
              style={{ color: active ? 'var(--gold)' : 'rgba(255,255,255,0.45)', transition: 'color 0.2s' }}>
              <Icon size={active ? 22 : 20} strokeWidth={active ? 2.5 : 1.8}
                style={{
                  filter: active ? 'drop-shadow(0 0 7px rgba(212,168,67,0.55))' : 'none',
                  transition: 'all 0.2s ease',
                }} />
              <span className="text-[9.5px] font-bold uppercase tracking-wider font-sans">{label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
