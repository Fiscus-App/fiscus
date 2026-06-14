'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Send, ArrowLeft, Users, Copy, Check, X } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Member { id: string; name: string | null; role: string }

interface Message {
  id:        string
  content:   string
  type:      string
  createdAt: string
  user:      { id: string; name: string | null }
}

interface TeamDetail {
  id:          string
  name:        string
  inviteCode:  string
  memberCount: number
  members:     Member[]
  role:        string
  lastMessage: null
  createdAt:   string
}

// ── Colour helpers ────────────────────────────────────────────────────────────
const COLOURS = ['#5b8af5','#22d48a','#a78bfa','#f97316','#e8b84b','#06b6d4','#ec4899','#f43f5e']
function colour(id: string) {
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return COLOURS[Math.abs(h) % COLOURS.length]
}
function initials(name: string | null) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}
function relTime(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

// ── Members sheet ─────────────────────────────────────────────────────────────
function MembersSheet({ team, onClose }: { team: TeamDetail; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(team.inviteCode).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(5,8,26,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="w-full rounded-t-3xl max-h-[70vh] overflow-y-auto"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
        onClick={e => e.stopPropagation()}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--line-2)' }} />
        </div>

        <div className="px-5 pb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif font-semibold text-[17px]">{team.name}</h3>
            <button onClick={onClose} className="flex items-center justify-center"
              style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--bg-3)', color: 'var(--text-muted)' }}>
              <X size={13} strokeWidth={2.5} />
            </button>
          </div>

          {/* Invite code */}
          <div className="rounded-2xl p-4 mb-5"
            style={{ background: 'var(--bg-3)', border: '1px solid var(--line)' }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-muted)' }}>
              Invite Code
            </p>
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-[22px] tracking-[0.15em]" style={{ color: 'var(--gold)' }}>
                {team.inviteCode}
              </span>
              <button onClick={copy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all"
                style={{
                  background: copied ? 'rgba(34,212,138,0.12)' : 'rgba(232,184,75,0.12)',
                  border: copied ? '1px solid rgba(34,212,138,0.3)' : '1px solid rgba(232,184,75,0.3)',
                  color: copied ? 'var(--green)' : 'var(--gold)',
                }}>
                {copied ? <Check size={11} strokeWidth={3} /> : <Copy size={11} strokeWidth={2} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
              Share this code with anyone to invite them to this team
            </p>
          </div>

          {/* Members */}
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--text-muted)' }}>
            Members ({team.memberCount})
          </p>
          <div className="space-y-2">
            {team.members.map(m => (
              <div key={m.id} className="flex items-center gap-3">
                <div className="flex items-center justify-center font-bold text-[11px]"
                  style={{
                    width: 36, height: 36, borderRadius: 12,
                    background: `${colour(m.id)}18`,
                    border: `1.5px solid ${colour(m.id)}40`,
                    color: colour(m.id),
                  }}>
                  {initials(m.name)}
                </div>
                <div>
                  <p className="text-[13px] font-medium">{m.name ?? 'Unknown'}</p>
                  {m.role === 'OWNER' && (
                    <p className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--gold)' }}>Owner</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main chat page ────────────────────────────────────────────────────────────
export default function TeamChatPage() {
  const params  = useParams()
  const router  = useRouter()
  const { data: session } = useSession()
  const teamId  = params.teamId as string

  const [team, setTeam]         = useState<TeamDetail | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft]       = useState('')
  const [sending, setSending]   = useState(false)
  const [loading, setLoading]   = useState(true)
  const [showMembers, setShowMembers] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const bottomRef  = useRef<HTMLDivElement>(null)
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load team info + messages
  const loadMessages = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [teamRes, msgRes] = await Promise.all([
        fetch('/api/teams'),
        fetch(`/api/teams/${teamId}/messages`),
      ])
      if (teamRes.ok) {
        const data = await teamRes.json()
        const found = data.teams?.find((t: TeamDetail) => t.id === teamId)
        if (found) setTeam(found)
        else setNotFound(true)
      }
      if (msgRes.ok) {
        const data = await msgRes.json()
        setMessages(data.messages ?? [])
      }
    } catch { /* keep */ } finally { setLoading(false) }
  }, [teamId])

  useEffect(() => {
    loadMessages()
    pollRef.current = setInterval(() => loadMessages(true), 3000) // poll every 3s
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [loadMessages])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setDraft('')
    try {
      const res = await fetch(`/api/teams/${teamId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      if (res.ok) {
        const msg = await res.json()
        setMessages(prev => [...prev, msg])
      }
    } catch { setDraft(text) } finally { setSending(false) }
  }

  if (notFound) return (
    <div className="h-full flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--bg)' }}>
      <p className="font-serif text-[18px] mb-2">Team not found</p>
      <p className="text-[13px] mb-6" style={{ color: 'var(--text-muted)' }}>
        You may not be a member of this team.
      </p>
      <button onClick={() => router.push('/teams')}
        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[13px] font-semibold"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text-secondary)' }}>
        <ArrowLeft size={14} strokeWidth={2} /> Back to Teams
      </button>
    </div>
  )

  const myId = session?.user?.id

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>

      {/* ── Channel header ───────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3"
        style={{ background: 'rgba(10,16,32,0.97)', borderBottom: '1px solid var(--line)', backdropFilter: 'blur(16px)' }}>
        <button onClick={() => router.push('/teams')}
          className="flex items-center justify-center flex-shrink-0"
          style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--bg-3)', border: '1px solid var(--line)', color: 'var(--text-muted)' }}>
          <ArrowLeft size={14} strokeWidth={2} />
        </button>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14px] truncate">{team?.name ?? '…'}</p>
          <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
            {team ? `${team.memberCount} member${team.memberCount !== 1 ? 's' : ''}` : ''}
          </p>
        </div>

        <button onClick={() => setShowMembers(true)}
          className="flex items-center justify-center flex-shrink-0"
          style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--bg-3)', border: '1px solid var(--line)', color: 'var(--text-muted)' }}>
          <Users size={15} strokeWidth={1.8} />
        </button>
      </div>

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scroll-y px-4 py-4 space-y-3">
        {loading && (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full"
              style={{ width: 22, height: 22, border: '2px solid var(--line)', borderTopColor: 'var(--gold)' }} />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-[13px] mb-1" style={{ color: 'var(--text-muted)' }}>No messages yet</p>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Be the first to share an insight
            </p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMe    = msg.user.id === myId
          const prev    = idx > 0 ? messages[idx - 1] : null
          const grouped = prev?.user.id === msg.user.id
          const c       = colour(msg.user.id)

          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              style={{ marginTop: grouped ? 4 : 12 }}>

              {/* Avatar — first in group only */}
              {!isMe && (
                <div style={{ width: 30, flexShrink: 0 }}>
                  {!grouped && (
                    <div className="flex items-center justify-center font-bold text-[9px]"
                      style={{
                        width: 30, height: 30, borderRadius: 10,
                        background: `${c}18`, border: `1.5px solid ${c}50`, color: c,
                      }}>
                      {initials(msg.user.name)}
                    </div>
                  )}
                </div>
              )}

              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                {!isMe && !grouped && (
                  <span className="text-[10px] font-semibold mb-1 ml-1" style={{ color: c }}>
                    {msg.user.name ?? 'Unknown'}
                  </span>
                )}
                <div className="rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed"
                  style={{
                    background: isMe
                      ? 'linear-gradient(135deg, rgba(232,184,75,0.16) 0%, rgba(232,184,75,0.08) 100%)'
                      : 'var(--bg-3)',
                    border: `1px solid ${isMe ? 'rgba(232,184,75,0.28)' : 'var(--line-2)'}`,
                    color: isMe ? 'var(--text-primary)' : 'var(--text-secondary)',
                    borderBottomRightRadius: isMe ? 6 : undefined,
                    borderBottomLeftRadius:  !isMe ? 6 : undefined,
                  }}>
                  {msg.content}
                </div>
                {!grouped && (
                  <span className="text-[9px] mt-1 mx-1 font-mono" style={{ color: 'var(--text-faint)' }}>
                    {relTime(msg.createdAt)}
                  </span>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Composer ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-end gap-2.5 px-3 py-3"
        style={{ background: 'rgba(8,12,24,0.97)', borderTop: '1px solid var(--line)', backdropFilter: 'blur(16px)' }}>

        {/* My avatar */}
        {myId && (
          <div className="flex-shrink-0 flex items-center justify-center font-bold text-[10px] mb-0.5"
            style={{
              width: 30, height: 30, borderRadius: 10,
              background: `${colour(myId)}18`, border: `1.5px solid ${colour(myId)}50`, color: colour(myId),
            }}>
            {initials(session?.user?.name ?? null)}
          </div>
        )}

        <div className="flex-1 flex items-center gap-2 rounded-xl px-3.5 py-2.5"
          style={{ background: 'var(--bg-3)', border: '1px solid var(--line-2)' }}>
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Share an insight…"
            rows={1}
            className="flex-1 bg-transparent text-[13px] resize-none outline-none"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}
          />
        </div>

        <button
          onClick={send}
          disabled={!draft.trim() || sending}
          className="flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-25 mb-0.5"
          style={{
            width: 38, height: 38, borderRadius: 12,
            background: draft.trim() ? 'linear-gradient(135deg, #e8b84b 0%, #f5cc5a 100%)' : 'var(--bg-3)',
            color: draft.trim() ? '#05081a' : 'var(--text-muted)',
            boxShadow: draft.trim() ? '0 0 16px rgba(232,184,75,0.28)' : 'none',
          }}>
          <Send size={15} strokeWidth={2.5} />
        </button>
      </div>

      {showMembers && team && <MembersSheet team={team} onClose={() => setShowMembers(false)} />}
    </div>
  )
}
