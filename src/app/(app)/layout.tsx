'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { TickerTape } from '@/components/markets/TickerTape'
import { Zap, TrendingUp, Users, Bookmark, Search, Bell } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/feed',    Icon: Zap,        label: 'Feed'    },
  { href: '/markets', Icon: TrendingUp, label: 'Markets' },
  { href: '/teams',   Icon: Users,      label: 'Teams'   },
  { href: '/saved',   Icon: Bookmark,   label: 'Saved'   },
]

const HEADER_H = 58
const NAV_H    = 70

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [_notif, setNotif] = useState(false)
  const isFeed = pathname.startsWith('/feed')

  const userInitial = session?.user?.name
    ? session.user.name.charAt(0).toUpperCase()
    : session?.user?.email
    ? session.user.email.charAt(0).toUpperCase()
    : '?'

  return (
    <div className="flex flex-col" style={{ height: '100dvh', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className="flex-shrink-0 flex items-center justify-between px-4 z-30"
        style={{
          height: HEADER_H,
          background: isFeed
            ? 'linear-gradient(180deg, rgba(5,8,26,0.92) 0%, transparent 100%)'
            : 'rgba(8,12,24,0.96)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: isFeed ? 'none' : '1px solid rgba(232,184,75,0.10)',
          position: isFeed ? 'absolute' : 'relative',
          top: 0, left: 0, right: 0,
        }}
      >
        {/* Logo */}
        <Link href="/feed" className="flex items-center gap-2.5 no-underline">
          {/* Icon mark */}
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'linear-gradient(145deg, rgba(232,184,75,0.18) 0%, rgba(232,184,75,0.06) 100%)',
            border: '1px solid rgba(232,184,75,0.32)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(232,184,75,0.12)',
          }}>
            <TrendingUp size={16} strokeWidth={2} style={{ color: 'var(--gold)' }} />
          </div>

          {/* Wordmark */}
          <span
            className="font-serif font-bold"
            style={{
              fontSize: 22,
              background: 'linear-gradient(135deg, #e8b84b 0%, #f5cc5a 55%, #d4a438 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.01em',
              textShadow: isFeed ? undefined : 'none',
            }}
          >
            Fiscus
          </span>

          <span
            className="text-[7px] font-bold tracking-[0.18em] uppercase px-1.5 py-0.5 rounded-sm"
            style={{ background: 'var(--gold)', color: '#05081a', letterSpacing: '0.18em' }}
          >
            BETA
          </span>
        </Link>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Live indicator — non-feed */}
          {!isFeed && (
            <div className="flex items-center gap-1.5 font-mono text-[9px] tracking-widest mr-1"
              style={{ color: 'var(--green)' }}>
              <span className="live-dot inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--green)' }} />
              LIVE
            </div>
          )}

          {/* Search */}
          <Link href="/feed?search=1"
            className="flex items-center justify-center"
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: isFeed ? 'rgba(255,255,255,0.08)' : 'var(--bg-3)',
              border: `1px solid ${isFeed ? 'rgba(255,255,255,0.14)' : 'var(--line-2)'}`,
              color: isFeed ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)',
              backdropFilter: isFeed ? 'blur(8px)' : 'none',
            }}>
            <Search size={14} strokeWidth={2} />
          </Link>

          {/* Notifications */}
          <button
            onClick={() => setNotif((o) => !o)}
            className="relative flex items-center justify-center"
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: isFeed ? 'rgba(255,255,255,0.08)' : 'var(--bg-3)',
              border: `1px solid ${isFeed ? 'rgba(255,255,255,0.14)' : 'var(--line-2)'}`,
              color: isFeed ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)',
              backdropFilter: isFeed ? 'blur(8px)' : 'none',
            }}>
            <Bell size={14} strokeWidth={2} />
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
              style={{ background: 'var(--red)', color: '#fff', border: '1.5px solid var(--bg)' }}
            >
              3
            </span>
          </button>

          {/* Avatar */}
          <Link href="/profile"
            className="flex items-center justify-center font-bold text-[11px]"
            style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'rgba(232,184,75,0.10)',
              border: '1.5px solid rgba(232,184,75,0.38)',
              color: 'var(--gold)',
              boxShadow: '0 0 12px rgba(232,184,75,0.10)',
            }}>
            {userInitial}
          </Link>
        </div>
      </header>

      {/* ── Ticker tape ────────────────────────────────────────────────────── */}
      {!isFeed && <TickerTape />}

      {/* ── Page content ───────────────────────────────────────────────────── */}
      <main
        className="flex-1 overflow-hidden"
        style={{ position: isFeed ? 'relative' : undefined, marginTop: isFeed ? -HEADER_H : 0 }}
      >
        {children}
      </main>

      {/* ── Bottom nav ─────────────────────────────────────────────────────── */}
      <nav
        className="flex-shrink-0 flex z-30 relative"
        style={{
          height: NAV_H,
          background: isFeed ? 'rgba(5,8,26,0.88)' : 'rgba(7,11,22,0.98)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        }}
      >
        {NAV_ITEMS.map(({ href, Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center no-underline relative"
              style={{
                gap: 5,
                color: active ? 'var(--gold)' : 'rgba(255,255,255,0.38)',
                transition: 'color 0.2s ease',
                paddingBottom: 6,
              }}
            >
              {/* Active top indicator */}
              {active && (
                <span
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 28,
                    height: 2,
                    borderRadius: 1,
                    background: 'var(--gold)',
                    boxShadow: 'var(--glow-gold-sm)',
                  }}
                />
              )}

              {/* Icon */}
              <Icon
                size={active ? 23 : 21}
                strokeWidth={active ? 2.2 : 1.6}
                style={{
                  filter: active ? 'drop-shadow(0 0 8px rgba(232,184,75,0.50))' : 'none',
                  transition: 'all 0.2s ease',
                }}
              />

              {/* Label */}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: active ? 700 : 500,
                  fontFamily: 'var(--font-sans)',
                  letterSpacing: '0.04em',
                  transition: 'all 0.2s ease',
                }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
