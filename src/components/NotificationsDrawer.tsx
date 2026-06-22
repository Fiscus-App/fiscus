'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X, Bookmark, TrendingUp, Bell, Zap } from 'lucide-react'
import { SECTOR_COLORS } from '@/lib/ingestion/sources'

// ── Types ─────────────────────────────────────────────────────────────────────

interface NotifArticle {
  id: string
  title: string
  summary: string | null
  sector: string | null
  ticker: string
  publishedAt: string
  savedAt?: string
  source: string
}

interface NotificationsPayload {
  breaking:     NotifArticle[]
  saves:        NotifArticle[]
  followAlerts: NotifArticle[]
  source?:      string
}

// ── Relative time ─────────────────────────────────────────────────────────────

function rel(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Article row ───────────────────────────────────────────────────────────────

function ArticleRow({
  article, onTap,
}: { article: NotifArticle; onTap: (id: string) => void }) {
  const colour = SECTOR_COLORS[article.sector ?? ''] ?? SECTOR_COLORS['default']

  return (
    <button
      onClick={() => onTap(article.id)}
      className="w-full text-left px-4 py-3 flex gap-3"
      style={{ borderBottom: '1px solid var(--line)' }}
    >
      {/* Ticker badge */}
      <div
        className="flex-shrink-0 flex items-center justify-center font-mono font-bold text-[10px] rounded-xl"
        style={{
          width: 40, height: 40,
          background: `${colour}18`,
          border: `1px solid ${colour}30`,
          color: colour,
          letterSpacing: '-0.02em',
        }}
      >
        {article.ticker.slice(0, 4)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[12px] font-medium leading-snug line-clamp-2"
          style={{ color: 'var(--text-primary)' }}
        >
          {article.title}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {article.source}
          </span>
          <span style={{ color: 'var(--line-2)' }}>·</span>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {rel(article.savedAt ?? article.publishedAt)}
          </span>
        </div>
      </div>
    </button>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon, label, count, colour,
}: { icon: React.ElementType; label: string; count: number; colour: string }) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2.5 sticky top-0 z-10"
      style={{
        background: 'var(--bg-2)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <Icon size={12} strokeWidth={2.5} style={{ color: colour }} />
      <span
        className="text-[9px] font-bold uppercase tracking-[0.18em] font-mono"
        style={{ color: colour }}
      >
        {label}
      </span>
      {count > 0 && (
        <span
          className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: `${colour}20`, color: colour }}
        >
          {count}
        </span>
      )}
    </div>
  )
}

// ── Empty state for a section ─────────────────────────────────────────────────

function EmptySection({ label }: { label: string }) {
  return (
    <div className="px-4 py-5 text-center">
      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  )
}

// ── Drawer ────────────────────────────────────────────────────────────────────

interface Props {
  open:    boolean
  onClose: () => void
}

export function NotificationsDrawer({ open, onClose }: Props) {
  const router = useRouter()
  const [data, setData]       = useState<NotificationsPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab]         = useState<'all' | 'saves' | 'following'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) setData(await res.json())
    } catch { /* keep null */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (open) load() }, [open, load])

  const handleTap = useCallback((id: string) => {
    onClose()
    router.push(`/article/${id}`)
  }, [onClose, router])

  const totalAlerts = (data?.followAlerts.length ?? 0) + (data?.breaking.length ?? 0)

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(5,8,26,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className="fixed z-50 flex flex-col"
        style={{
          top: 58, // below header
          right: 0,
          bottom: 70, // above nav
          width: '100%',
          maxWidth: 420,
          background: 'var(--bg)',
          borderLeft: '1px solid var(--line)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(0.32, 0, 0.18, 1)',
          willChange: 'transform',
          overflowY: 'auto',
        }}
      >
        {/* ── Drawer header ──────────────────────────────────────────────── */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}
        >
          <div className="flex items-center gap-2">
            <Bell size={15} strokeWidth={2} style={{ color: 'var(--gold)' }} />
            <span className="font-serif font-semibold text-[16px]">Notifications</span>
            {totalAlerts > 0 && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--red)', color: '#fff' }}
              >
                {totalAlerts}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center"
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'var(--bg-3)', border: '1px solid var(--line)',
              color: 'var(--text-muted)',
            }}
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div
          className="flex-shrink-0 flex gap-1 p-2"
          style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}
        >
          {([
            { key: 'all',       label: 'Breaking'  },
            { key: 'following', label: 'Following' },
            { key: 'saves',     label: 'Saved'     },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
              style={{
                background: tab === key
                  ? 'linear-gradient(135deg, #e8b84b 0%, #f5cc5a 100%)'
                  : 'var(--bg-2)',
                color: tab === key ? '#05081a' : 'var(--text-muted)',
                border: tab === key ? 'none' : '1px solid var(--line)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Content ────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div
                className="animate-spin rounded-full"
                style={{ width: 24, height: 24, border: '2px solid var(--line)', borderTopColor: 'var(--gold)' }}
              />
            </div>
          )}

          {!loading && data && (
            <>
              {/* Breaking / All tab */}
              {tab === 'all' && (
                <>
                  <SectionHeader icon={Zap} label="Breaking News" count={data.breaking.length} colour="#e8b84b" />
                  {data.breaking.length === 0
                    ? <EmptySection label="No breaking news in the last 24 hours" />
                    : data.breaking.map(a => (
                        <ArticleRow key={a.id} article={a} onTap={handleTap} />
                      ))
                  }
                </>
              )}

              {/* Following alerts tab */}
              {tab === 'following' && (
                <>
                  <SectionHeader icon={TrendingUp} label="Your Alerts" count={data.followAlerts.length} colour="#5b8af5" />
                  {data.followAlerts.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <TrendingUp size={28} strokeWidth={1.5} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                      <p className="text-[12px] mb-1" style={{ color: 'var(--text-muted)' }}>
                        No alerts from your follows in the last 6 hours
                      </p>
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                        Add stocks and sectors in Profile → Following
                      </p>
                    </div>
                  ) : (
                    data.followAlerts.map(a => (
                      <ArticleRow key={a.id} article={a} onTap={handleTap} />
                    ))
                  )}
                </>
              )}

              {/* Saves tab */}
              {tab === 'saves' && (
                <>
                  <SectionHeader icon={Bookmark} label="Saved Articles" count={data.saves.length} colour="#a78bfa" />
                  {data.saves.length === 0
                    ? <EmptySection label="Tap the bookmark icon on any article to save it" />
                    : data.saves.map(a => (
                        <ArticleRow key={a.id} article={a} onTap={handleTap} />
                      ))
                  }
                </>
              )}
            </>
          )}

          {!loading && !data && (
            <div className="px-4 py-8 text-center">
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                Could not load notifications
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
