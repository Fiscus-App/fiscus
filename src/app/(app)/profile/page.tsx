'use client'

import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { Bell, Shield, HelpCircle, LogOut, ChevronRight, Bookmark, Lightbulb, Eye, Settings, Pencil, Check, X } from 'lucide-react'

interface Stats { saves: number; insightfuls: number; watches: number }

const SETTINGS_ROWS = [
  { label: 'Notifications',      sub: 'Manage alerts & briefings',   icon: Bell       },
  { label: 'Preferences',        sub: 'Feed topics & sectors',       icon: Settings   },
  { label: 'Privacy & Security', sub: 'Account security settings',   icon: Shield     },
  { label: 'Help & Support',     sub: 'FAQs and contact',            icon: HelpCircle },
]

const TIER_LABELS: Record<string, string> = {
  FREE:       'Fiscus Beta',
  PRO:        'Fiscus Pro',
  TEAM:       'Fiscus Teams',
  ENTERPRISE: 'Enterprise',
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession()
  const [stats, setStats]         = useState<Stats | null>(null)
  const [editing, setEditing]     = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving]       = useState(false)

  const name    = session?.user?.name  ?? 'Guest'
  const email   = session?.user?.email ?? ''
  const tier    = (session?.user as any)?.tier ?? 'FREE'
  const initial = name.charAt(0).toUpperCase()

  useEffect(() => {
    fetch('/api/profile/stats')
      .then((r) => r.json())
      .then((d) => { if (!d.error) setStats(d) })
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
    } finally {
      setSaving(false)
    }
  }

  const STATS = [
    { label: 'Saved',      value: stats?.saves      ?? '—', icon: Bookmark  },
    { label: 'Insightful', value: stats?.insightfuls ?? '—', icon: Lightbulb },
    { label: 'Watched',    value: stats?.watches     ?? '—', icon: Eye       },
  ]

  return (
    <div className="h-full overflow-y-auto scroll-y" style={{ background: 'var(--bg)' }}>
      <div className="px-4 py-6 space-y-5">

        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold font-serif"
            style={{
              background: 'var(--gold-a)',
              border: '2px solid var(--gold-c)',
              color: 'var(--gold)',
              boxShadow: '0 0 30px rgba(212,168,67,0.15)',
            }}
          >
            {initial}
          </div>

          <div className="text-center">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName()
                    if (e.key === 'Escape') setEditing(false)
                  }}
                  className="font-serif text-[18px] font-medium text-center rounded-lg px-2 py-1 outline-none w-40"
                  style={{ background: 'var(--bg-3)', border: '1px solid var(--gold-b)', color: 'var(--text-primary)' }}
                />
                <button
                  onClick={handleSaveName}
                  disabled={saving}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--gold)', color: '#07091a' }}
                >
                  <Check size={13} strokeWidth={3} />
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--bg-3)', color: 'var(--text-muted)' }}
                >
                  <X size={13} strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 justify-center">
                <div className="font-serif text-[18px] font-medium">{name}</div>
                <button
                  onClick={() => { setNameInput(name); setEditing(true) }}
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ color: 'var(--text-muted)', background: 'var(--bg-3)' }}
                >
                  <Pencil size={11} strokeWidth={2} />
                </button>
              </div>
            )}
            {email && (
              <div className="text-[12px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {email}
              </div>
            )}
          </div>

          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
            style={{ background: 'var(--gold)', color: '#07091a' }}
          >
            BETA ACCESS
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {STATS.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-2xl p-3 flex flex-col items-center gap-1.5"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
            >
              <Icon size={16} strokeWidth={1.8} style={{ color: 'var(--gold)' }} />
              <span className="font-mono font-semibold text-[17px]">{value}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Plan */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'linear-gradient(135deg, rgba(212,168,67,0.1) 0%, rgba(212,168,67,0.04) 100%)',
            border: '1px solid var(--gold-b)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: 'var(--gold)' }}>
                Current Plan
              </div>
              <div className="font-serif text-[16px] font-medium mt-0.5">{TIER_LABELS[tier] ?? 'Fiscus Beta'}</div>
              <div className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                Full access · Free during beta
              </div>
            </div>
            <div
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold"
              style={{ background: 'var(--gold)', color: '#07091a' }}
            >
              Upgrade
            </div>
          </div>
        </div>

        {/* Settings rows */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest font-mono" style={{ color: 'var(--text-muted)' }}>
              Settings
            </span>
            <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
            {SETTINGS_ROWS.map(({ label, sub, icon: Icon }, i) => (
              <button
                key={label}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
                style={{
                  background: 'var(--bg-2)',
                  borderBottom: i < SETTINGS_ROWS.length - 1 ? '1px solid var(--line)' : 'none',
                  color: 'var(--text-primary)',
                }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--bg-3)', border: '1px solid var(--line)' }}
                >
                  <Icon size={14} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium">{label}</div>
                  <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{sub}</div>
                </div>
                <ChevronRight size={14} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
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
          <LogOut size={15} strokeWidth={2} />
          Sign Out
        </button>

        <div style={{ height: 8 }} />
      </div>
    </div>
  )
}
