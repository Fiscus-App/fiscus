'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Plus, LogIn, Copy, Check, ChevronRight, X, MessageSquare } from 'lucide-react'

interface TeamSummary {
  id:          string
  name:        string
  inviteCode:  string
  memberCount: number
  members:     { id: string; name: string | null; role: string }[]
  role:        string
  lastMessage: { content: string; senderName: string | null; createdAt: string } | null
  createdAt:   string
}

// ── Relative time ─────────────────────────────────────────────────────────────
function rel(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Avatar stack ──────────────────────────────────────────────────────────────
const MEMBER_COLOURS = ['#5b8af5','#22d48a','#a78bfa','#f97316','#e8b84b','#06b6d4','#ec4899']
function memberColour(id: string) {
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return MEMBER_COLOURS[Math.abs(h) % MEMBER_COLOURS.length]
}
function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ── Create team modal ─────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreate }: {
  onClose:  () => void
  onCreate: (team: TeamSummary) => void
}) {
  const [name, setName]     = useState('')
  const [desc, setDesc]     = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  async function submit() {
    if (!name.trim()) return setErr('Team name is required')
    setSaving(true); setErr('')
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: desc.trim() }),
      })
      const data = await res.json()
      if (!res.ok) return setErr(data.error ?? 'Failed to create team')
      onCreate(data.team)
    } catch { setErr('Network error') } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-4"
      style={{ background: 'rgba(5,8,26,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-lg rounded-3xl overflow-hidden"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--line)' }}>
          <span className="font-serif font-semibold text-[17px]">New Team</span>
          <button onClick={onClose} className="flex items-center justify-center"
            style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg-3)', color: 'var(--text-muted)' }}>
            <X size={13} strokeWidth={2.5} />
          </button>
        </div>

        {/* Fields */}
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5"
              style={{ color: 'var(--text-muted)' }}>Team Name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="e.g. ASX Research Desk"
              className="w-full rounded-xl px-3.5 py-2.5 text-[14px] outline-none"
              style={{ background: 'var(--bg-3)', border: '1px solid var(--line-2)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5"
              style={{ color: 'var(--text-muted)' }}>Description (optional)</label>
            <input
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="What does this team discuss?"
              className="w-full rounded-xl px-3.5 py-2.5 text-[14px] outline-none"
              style={{ background: 'var(--bg-3)', border: '1px solid var(--line-2)', color: 'var(--text-primary)' }}
            />
          </div>
          {err && <p className="text-[11px]" style={{ color: 'var(--red)' }}>{err}</p>}
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={submit}
            disabled={saving || !name.trim()}
            className="w-full py-3 rounded-2xl font-semibold text-[14px] transition-all disabled:opacity-40"
            style={{
              background: 'linear-gradient(135deg, #e8b84b 0%, #f5cc5a 100%)',
              color: '#05081a',
              boxShadow: '0 0 20px rgba(232,184,75,0.20)',
            }}
          >
            {saving ? 'Creating…' : 'Create Team'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Join team modal ───────────────────────────────────────────────────────────
function JoinModal({ onClose, onJoin }: {
  onClose: () => void
  onJoin:  (teamId: string) => void
}) {
  const [code, setCode]     = useState('')
  const [joining, setJoining] = useState(false)
  const [err, setErr]       = useState('')

  async function submit() {
    const clean = code.trim().toUpperCase()
    if (!clean) return setErr('Enter an invite code')
    setJoining(true); setErr('')
    try {
      const res = await fetch('/api/teams/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: clean }),
      })
      const data = await res.json()
      if (!res.ok) return setErr(data.error ?? 'Invalid code')
      onJoin(data.teamId)
    } catch { setErr('Network error') } finally { setJoining(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-4"
      style={{ background: 'rgba(5,8,26,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-lg rounded-3xl overflow-hidden"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>

        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--line)' }}>
          <span className="font-serif font-semibold text-[17px]">Join a Team</span>
          <button onClick={onClose} className="flex items-center justify-center"
            style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg-3)', color: 'var(--text-muted)' }}>
            <X size={13} strokeWidth={2.5} />
          </button>
        </div>

        <div className="px-5 py-4">
          <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5"
            style={{ color: 'var(--text-muted)' }}>Invite Code</label>
          <input
            autoFocus
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="XXXX-XXXX"
            className="w-full rounded-xl px-3.5 py-2.5 text-[16px] font-mono outline-none tracking-widest text-center"
            style={{ background: 'var(--bg-3)', border: '1px solid var(--line-2)', color: 'var(--text-primary)' }}
            maxLength={9}
          />
          {err && <p className="text-[11px] mt-2" style={{ color: 'var(--red)' }}>{err}</p>}
          <p className="text-[11px] mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
            Ask a team member to share their invite code with you
          </p>
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={submit}
            disabled={joining || code.trim().length < 9}
            className="w-full py-3 rounded-2xl font-semibold text-[14px] transition-all disabled:opacity-40"
            style={{ background: 'var(--bg-3)', border: '1px solid rgba(232,184,75,0.30)', color: 'var(--gold)' }}
          >
            {joining ? 'Joining…' : 'Join Team'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Invite code copy pill ─────────────────────────────────────────────────────
function InviteCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  function copy(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all"
      style={{
        background: copied ? 'rgba(34,212,138,0.12)' : 'var(--bg-3)',
        border: copied ? '1px solid rgba(34,212,138,0.3)' : '1px solid var(--line)',
        color: copied ? 'var(--green)' : 'var(--text-muted)',
      }}
    >
      {copied ? <Check size={9} strokeWidth={3} /> : <Copy size={9} strokeWidth={2} />}
      {code}
    </button>
  )
}

// ── Team card ─────────────────────────────────────────────────────────────────
function TeamCard({ team, onClick }: { team: TeamSummary; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl p-4 transition-all active:scale-[0.98]"
      style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 flex items-center justify-center"
          style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'rgba(91,138,245,0.10)',
            border: '1px solid rgba(91,138,245,0.22)',
          }}>
          <Users size={18} strokeWidth={1.8} style={{ color: '#5b8af5' }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-[14px] truncate">{team.name}</span>
            <ChevronRight size={14} strokeWidth={2} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </div>

          {/* Last message preview */}
          {team.lastMessage ? (
            <p className="text-[11px] truncate mb-2" style={{ color: 'var(--text-muted)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{team.lastMessage.senderName ?? 'Someone'}: </span>
              {team.lastMessage.content}
              <span className="ml-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
                · {rel(team.lastMessage.createdAt)}
              </span>
            </p>
          ) : (
            <p className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>No messages yet</p>
          )}

          <div className="flex items-center justify-between">
            {/* Member avatars */}
            <div className="flex items-center">
              {team.members.slice(0, 4).map((m, i) => (
                <div key={m.id}
                  className="flex items-center justify-center font-bold"
                  style={{
                    width: 20, height: 20, borderRadius: 10,
                    fontSize: 7,
                    background: `${memberColour(m.id)}20`,
                    border: `1.5px solid ${memberColour(m.id)}60`,
                    color: memberColour(m.id),
                    marginLeft: i > 0 ? -5 : 0,
                    position: 'relative',
                    zIndex: 4 - i,
                  }}>
                  {initials(m.name)}
                </div>
              ))}
              {team.memberCount > 4 && (
                <span className="text-[9px] ml-1.5" style={{ color: 'var(--text-muted)' }}>
                  +{team.memberCount - 4}
                </span>
              )}
            </div>
            <InviteCode code={team.inviteCode} />
          </div>
        </div>
      </div>
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TeamsPage() {
  const router = useRouter()
  const [teams, setTeams]       = useState<TeamSummary[]>([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState<'create' | 'join' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/teams')
      if (res.ok) {
        const data = await res.json()
        setTeams(data.teams ?? [])
      }
    } catch { /* keep empty */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function handleCreated(team: TeamSummary) {
    setTeams(prev => [team, ...prev])
    setModal(null)
    router.push(`/teams/${team.id}`)
  }

  function handleJoined(teamId: string) {
    setModal(null)
    load() // refresh list
    router.push(`/teams/${teamId}`)
  }

  return (
    <div className="h-full overflow-y-auto scroll-y" style={{ background: 'var(--bg)' }}>
      <div className="px-4 pt-5 pb-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="font-serif font-semibold text-[22px]" style={{ letterSpacing: '-0.02em' }}>
              Teams
            </h1>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Private group chats for your circle
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setModal('join')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text-secondary)' }}
            >
              <LogIn size={13} strokeWidth={2} />
              Join
            </button>
            <button
              onClick={() => setModal('create')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold"
              style={{
                background: 'linear-gradient(135deg, #e8b84b 0%, #f5cc5a 100%)',
                color: '#05081a',
                boxShadow: '0 0 14px rgba(232,184,75,0.18)',
              }}
            >
              <Plus size={13} strokeWidth={2.5} />
              New
            </button>
          </div>
        </div>

        {/* ── Team list ───────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full"
              style={{ width: 24, height: 24, border: '2px solid var(--line)', borderTopColor: 'var(--gold)' }} />
          </div>
        ) : teams.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex items-center justify-center mb-5"
              style={{
                width: 80, height: 80, borderRadius: 24,
                background: 'linear-gradient(135deg, rgba(91,138,245,0.10) 0%, rgba(91,138,245,0.04) 100%)',
                border: '1px solid rgba(91,138,245,0.18)',
              }}>
              <MessageSquare size={34} strokeWidth={1.4} style={{ color: '#5b8af5' }} />
            </div>
            <h2 className="font-serif font-semibold text-[19px] mb-2" style={{ letterSpacing: '-0.02em' }}>
              No teams yet
            </h2>
            <p className="text-[13px] mb-7" style={{ color: 'var(--text-muted)', maxWidth: 260 }}>
              Create a private group to discuss markets with your circle, or join one with an invite code.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setModal('join')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[13px] font-semibold"
                style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text-secondary)' }}
              >
                <LogIn size={14} strokeWidth={2} />
                Join with code
              </button>
              <button
                onClick={() => setModal('create')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[13px] font-semibold"
                style={{
                  background: 'linear-gradient(135deg, #e8b84b 0%, #f5cc5a 100%)',
                  color: '#05081a',
                  boxShadow: '0 0 20px rgba(232,184,75,0.22)',
                }}
              >
                <Plus size={14} strokeWidth={2.5} />
                Create team
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map(t => (
              <TeamCard key={t.id} team={t} onClick={() => router.push(`/teams/${t.id}`)} />
            ))}
          </div>
        )}
      </div>

      {modal === 'create' && <CreateModal onClose={() => setModal(null)} onCreate={handleCreated} />}
      {modal === 'join'   && <JoinModal   onClose={() => setModal(null)} onJoin={handleJoined} />}
    </div>
  )
}
