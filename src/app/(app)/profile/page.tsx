'use client'

import { Bell, Shield, HelpCircle, LogOut, ChevronRight, Bookmark, Lightbulb, Eye, Settings } from 'lucide-react'

const STATS = [
  { label: 'Saved', value: '2', icon: Bookmark },
  { label: 'Insightful', value: '847', icon: Lightbulb },
  { label: 'Watched', value: '124', icon: Eye },
]

const SETTINGS_ROWS = [
  { label: 'Notifications', sub: 'Manage alerts & briefings', icon: Bell },
  { label: 'Preferences', sub: 'Feed topics & sectors', icon: Settings },
  { label: 'Privacy & Security', sub: 'Account security settings', icon: Shield },
  { label: 'Help & Support', sub: 'FAQs and contact', icon: HelpCircle },
]

export default function ProfilePage() {
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
            B
          </div>
          <div className="text-center">
            <div className="font-serif text-[18px] font-medium">Beast</div>
            <div className="text-[12px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
              jacktaknew@gmail.com
            </div>
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
              <div className="font-serif text-[16px] font-medium mt-0.5">Fiscus Beta</div>
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
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid var(--line)' }}
          >
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
          className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-[13px] font-semibold transition-colors"
          style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--line)',
            color: 'var(--red)',
          }}
        >
          <LogOut size={15} strokeWidth={2} />
          Sign Out
        </button>

        <div style={{ height: 8 }} />
      </div>
    </div>
  )
}
