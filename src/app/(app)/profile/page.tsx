'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import {
  Bell, Shield, HelpCircle, LogOut, ChevronRight,
  Bookmark, Lightbulb, Eye, Settings, Pencil, Check, X,
  TrendingUp, Plus, Minus, Search, Users,
} from 'lucide-react'
import {
  getLocalFollows, setLocalFollows, isFollowing, toggleFollow,
  syncFollowToAPI, FOLLOW_CATALOGUE,
  type Follow, type FollowType,
} from '@/lib/following'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Stats { saves: number; insightfuls: number; watches: number }

const SETTINGS_ROWS = [
  { label: 'Notifications',      sub: 'Alerts, briefings & updates',  icon: Bell,       href: '/settings/notifications' },
  { label: 'Preferences',        sub: 'Feed topics, sectors & style', icon: Settings,   href: '/settings/preferences'   },
  { label: 'Privacy & Security', sub: 'Account and data settings',    icon: Shield,     href: '/settings/privacy'       },
  { label: 'Help & Support',     sub: 'FAQs, docs and contact',       icon: HelpCircle, href: '/settings/help'          },
]

const TIER_LABELS: Record<string, string> = {
  FREE:       'Fiscus Beta',
  PRO:        'Fiscus Pro',
  TEAM:       'Fiscus Teams',
  ENTERPRISE: 'Enterprise',
}

// ── Colour dot for type ───────────────────────────────────────────────────────
const TYPE_COLOUR: Record<FollowType, string> = {
  STOCK:   '#e8b84b',
  SECTOR:  '#5b8af5',
  SOURCE:  '#a78bfa',
  COMPANY: '#2ed494',
  INDEX:   '#f97316',
}

// ── Small follow chip in "Your Follows" list ──────────────────────────────────
function FollowChip({
  follow, onRemove,
}: { follow: Follow; onRemove: () => void }) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl px-3 py-2.5"
      style={{ background: 'var(--bg-3)', border: '1px solid var(--line)' }}
    >
      <div
        className="flex-shrink-0"
        style={{
          width: 8, height: 8, borderRadius: '50%',
          background: follow.meta?.sectorColor ?? TYPE_COLOUR[follow.type],
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold truncate">{follow.label}</div>
        <div className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {follow.type}
          {follow.meta?.exchange ? ` · ${follow.meta.exchange}` : ''}
        </div>
      </div>
      <button
        onClick={onRemove}
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 22, height: 22, borderRadius: 6,
          background: 'rgba(255,80,80,0.1)',
          border: '1px solid rgba(255,80,80,0.2)',
          color: 'var(--red)',
        }}
      >
        <Minus size={10} strokeWidth={2.5} />
      </button>
    </div>
  )
}

// ── Catalogue row ─────────────────────────────────────────────────────────────
function CatalogueRow({
  item, followed, onToggle,
}: { item: Follow; followed: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3 text-left"
      style={{ borderBottom: '1px solid var(--line)' }}
    >
      <div
        className="flex-shrink-0"
        style={{
          width: 10, height: 10, borderRadius: '50%',
          background: item.meta?.sectorColor ?? TYPE_COLOUR[item.type],
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium truncate">{item.label}</div>
        {item.meta?.exchange && (
          <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {item.meta.exchange}
          </div>
        )}
      </div>
      <div
        className="flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          width: 26, height: 26, borderRadius: 8,
          background: followed
            ? 'linear-gradient(135deg, #e8b84b 0%, #f5cc5a 100%)'
            : 'var(--bg-3)',
          border: followed
            ? '1px solid transparent'
            : '1px solid var(--line)',
          color: followed ? '#05081a' : 'var(--text-muted)',
        }}
      >
        {followed ? <Minus size={11} strokeWidth={2.5} /> : <Plus size={11} strokeWidth={2.5} />}
      </div>
    </button>
  )
}

// ── Following management tab ──────────────────────────────────────────────────
function FollowingTab() {
  const [follows, setFollows]     = useState<Follow[]>([])
  const [search, setSearch]       = useState('')
  const [catTab, setCatTab]       = useState<'stocks' | 'sectors' | 'sources'>('stocks')

  useEffect(() => { setFollows(getLocalFollows()) }, [])

  const handleToggle = useCallback((item: Follow) => {
    const next = toggleFollow(follows, item)
    setFollows(next)
    setLocalFollows(next)
    const action = isFollowing(follows, item.type, item.value) ? 'remove' : 'add'
    syncFollowToAPI(item, action)
  }, [follows])

  const handleRemove = useCallback((f: Follow) => {
    const next = follows.filter(x => !(x.type === f.type && x.value === f.value))
    setFollows(next)
    setLocalFollows(next)
    syncFollowToAPI(f, 'remove')
  }, [follows])

  const catalogue = FOLLOW_CATALOGUE[catTab] as Follow[]
  const filtered  = search.trim()
    ? catalogue.filter(i =>
        i.label.toLowerCase().includes(search.toLowerCase()) ||
        i.value.toLowerCase().includes(search.toLowerCase())
      )
    : catalogue

  return (
    <div>
      {/* Current follows */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <span
            className="text-[9px] font-bold uppercase tracking-[0.18em] font-mono"
            style={{ color: 'var(--text-muted)' }}
          >
            Your Following ({follows.length})
          </span>
          <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
        </div>

        {follows.length === 0 ? (
          <div
            className="rounded-2xl p-5 text-center"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
          >
            <Users size={24} strokeWidth={1.5} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              Add stocks, sectors & sources below
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {follows.map(f => (
              <FollowChip
                key={`${f.type}-${f.value}`}
                follow={f}
                onRemove={() => handleRemove(f)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add from catalogue */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-[9px] font-bold uppercase tracking-[0.18em] font-mono"
          style={{ color: 'var(--text-muted)' }}
        >
          Add More
        </span>
        <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
      </div>

      {/* Category tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl mb-3"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
      >
        {(['stocks', 'sectors', 'sources'] as const).map(t => (
          <button
            key={t}
            onClick={() => setCatTab(t)}
            className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all"
            style={{
              background: catTab === t
                ? 'linear-gradient(135deg, #e8b84b 0%, #f5cc5a 100%)'
                : 'transparent',
              color: catTab === t ? '#05081a' : 'var(--text-muted)',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-2 rounded-xl px-3 mb-3"
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--line)',
          height: 40,
        }}
      >
        <Search size={13} strokeWidth={2} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${catTab}…`}
          className="flex-1 bg-transparent outline-none text-[13px]"
          style={{ color: 'var(--text-primary)' }}
        />
        {search && (
          <button onClick={() => setSearch('')}>
            <X size={12} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
          </button>
        )}
      </div>

      {/* Catalogue list */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--line)', background: 'var(--bg-2)' }}
      >
        {filtered.length === 0 ? (
          <div className="p-5 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
            No results for "{search}"
          </div>
        ) : (
          filtered.map((item) => (
            <CatalogueRow
              key={`${item.type}-${item.value}`}
              item={item}
              followed={isFollowing(follows, item.type, item.value)}
              onToggle={() => handleToggle(item)}
            />
          ))
        )}
      </div>

      <p className="text-[10px] text-center mt-4" style={{ color: 'rgba(255,255,255,0.2)' }}>
        Your following list shapes your personalised feed
      </p>
    </div>
  )
}

// ── Main profile page ─────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession()
  const router = useRouter()
  const [stats, setStats]         = useState<Stats | null>(null)
  const [editing, setEditing]     = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving]       = useState(false)
  const [profileTab, setProfileTab] = useState<'overview' | 'following'>('overview')

  // Allow deep-linking straight to the Following tab (e.g. from Preferences).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('tab') === 'following') setProfileTab('following')
  }, [])

  const name    = session?.user?.name  ?? 'Guest'
  const email   = session?.user?.email ?? ''
  const tier    = (session?.user as { tier?: string })?.tier ?? 'FREE'
  const initial = name.charAt(0).toUpperCase()

  useEffect(() => {
    fetch('/api/profile/stats')
      .then(r => r.json())
      .then(d => { if (!d.error) setStats(d) })
      .catch(() => {})
  }, [])

  async function handleSaveName() {
    if (!nameInput.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameInput.trim() }),
      })
      if (res.ok) {
        await updateSession({ name: nameInput.trim() })
        setEditing(false)
      }
    } finally { setSaving(false) }
  }

  const STATS = [
    { label: 'Saved',      value: stats?.saves      ?? '—', icon: Bookmark  },
    { label: 'Insightful', value: stats?.insightfuls ?? '—', icon: Lightbulb },
    { label: 'Watched',    value: stats?.watches     ?? '—', icon: Eye       },
  ]

  return (
    <div className="h-full overflow-y-auto scroll-y" style={{ background: 'var(--bg)' }}>
      <div className="px-4 pb-8">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <div
          className="relative overflow-hidden rounded-b-3xl mb-5 pt-6 pb-6 px-4"
          style={{
            background: 'linear-gradient(180deg, rgba(232,184,75,0.08) 0%, rgba(232,184,75,0.02) 100%)',
            borderBottom: '1px solid rgba(232,184,75,0.12)',
          }}
        >
          <div
            className="absolute pointer-events-none"
            style={{
              top: -60, left: '50%', transform: 'translateX(-50%)',
              width: 200, height: 200, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(232,184,75,0.12) 0%, transparent 70%)',
            }}
          />

          <div className="flex flex-col items-center gap-3 relative">
            {/* Avatar */}
            <div
              className="flex items-center justify-center font-serif font-bold"
              style={{
                width: 80, height: 80, borderRadius: '50%', fontSize: 32,
                background: 'linear-gradient(145deg, rgba(232,184,75,0.16) 0%, rgba(232,184,75,0.06) 100%)',
                border: '2px solid rgba(232,184,75,0.40)',
                color: 'var(--gold)',
                boxShadow: '0 0 32px rgba(232,184,75,0.18)',
              }}
            >
              {initial}
            </div>

            {/* Name / edit */}
            <div className="text-center">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveName()
                      if (e.key === 'Escape') setEditing(false)
                    }}
                    className="font-serif text-[18px] font-medium text-center rounded-lg px-2 py-1 outline-none w-40"
                    style={{
                      background: 'var(--bg-3)',
                      border: '1px solid rgba(232,184,75,0.35)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={saving}
                    className="flex items-center justify-center"
                    style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--gold)', color: '#05081a' }}
                  >
                    <Check size={13} strokeWidth={3} />
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="flex items-center justify-center"
                    style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg-3)', color: 'var(--text-muted)' }}
                  >
                    <X size={13} strokeWidth={2.5} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-center">
                  <span className="font-serif font-semibold" style={{ fontSize: 20, letterSpacing: '-0.02em' }}>
                    {name}
                  </span>
                  <button
                    onClick={() => { setNameInput(name); setEditing(true) }}
                    className="flex items-center justify-center"
                    style={{ width: 22, height: 22, borderRadius: 6, color: 'var(--text-muted)', background: 'var(--bg-3)' }}
                  >
                    <Pencil size={10} strokeWidth={2} />
                  </button>
                </div>
              )}
              {email && (
                <p className="text-[11px] font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
                  {email}
                </p>
              )}
            </div>

            {/* Beta badge */}
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.16em]"
              style={{ background: 'var(--gold)', color: '#05081a' }}
            >
              <TrendingUp size={9} strokeWidth={3} />
              BETA ACCESS
            </div>
          </div>
        </div>

        {/* ── Profile tabs ──────────────────────────────────────────────── */}
        <div
          className="flex gap-1 p-1 rounded-2xl mb-5"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
        >
          {(['overview', 'following'] as const).map(t => (
            <button
              key={t}
              onClick={() => setProfileTab(t)}
              className="flex-1 py-2 rounded-xl text-[12px] font-semibold capitalize transition-all"
              style={{
                background: profileTab === t
                  ? 'linear-gradient(135deg, #e8b84b 0%, #f5cc5a 100%)'
                  : 'transparent',
                color: profileTab === t ? '#05081a' : 'var(--text-muted)',
              }}
            >
              {t === 'following' ? '⚡ Following' : 'Overview'}
            </button>
          ))}
        </div>

        {/* ── Overview tab ──────────────────────────────────────────────── */}
        {profileTab === 'overview' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {STATS.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="rounded-2xl p-3.5 flex flex-col items-center gap-1.5"
                  style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
                >
                  <Icon size={15} strokeWidth={1.8} style={{ color: 'var(--gold)' }} />
                  <span className="font-mono font-bold text-[18px]">{value}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Plan */}
            <div
              className="rounded-2xl p-4 mb-4"
              style={{
                background: 'linear-gradient(135deg, rgba(232,184,75,0.10) 0%, rgba(232,184,75,0.03) 100%)',
                border: '1px solid rgba(232,184,75,0.22)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--gold)' }}>
                    Current Plan
                  </div>
                  <div className="font-serif font-semibold text-[16px]" style={{ letterSpacing: '-0.01em' }}>
                    {TIER_LABELS[tier] ?? 'Fiscus Beta'}
                  </div>
                  <div className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    Full access · Free during beta period
                  </div>
                </div>
                <button
                  className="px-3.5 py-1.5 rounded-xl text-[11px] font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #e8b84b 0%, #f5cc5a 100%)',
                    color: '#05081a',
                    boxShadow: '0 0 16px rgba(232,184,75,0.22)',
                  }}
                >
                  Upgrade
                </button>
              </div>
            </div>

            {/* Settings */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] font-mono" style={{ color: 'var(--text-muted)' }}>
                  Settings
                </span>
                <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
              </div>
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
                {SETTINGS_ROWS.map(({ label, sub, icon: Icon, href }, i) => (
                  <button
                    key={label}
                    onClick={() => router.push(href)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                    style={{
                      background: 'var(--bg-2)',
                      borderBottom: i < SETTINGS_ROWS.length - 1 ? '1px solid var(--line)' : 'none',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <div
                      className="flex items-center justify-center flex-shrink-0"
                      style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: 'var(--bg-3)', border: '1px solid var(--line)',
                      }}
                    >
                      <Icon size={14} strokeWidth={1.8} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-medium">{label}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</div>
                    </div>
                    <ChevronRight size={13} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                  </button>
                ))}
              </div>
            </div>

            {/* Sign out */}
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-[13px] font-semibold"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--red)' }}
            >
              <LogOut size={14} strokeWidth={2} />
              Sign Out
            </button>
          </>
        )}

        {/* ── Following tab ─────────────────────────────────────────────── */}
        {profileTab === 'following' && <FollowingTab />}
      </div>
    </div>
  )
}
