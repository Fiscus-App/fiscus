'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Users, ChevronRight, Circle } from 'lucide-react'

interface Message {
  id: string
  userId: string
  userName: string
  content: string
  createdAt: string
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    userId: 'alex',
    userName: 'Alex K.',
    content: 'RBA decision just dropped. 6-3 hold. Markets are pricing November cut at ~68%.',
    createdAt: '9:41 AM',
  },
  {
    id: '2',
    userId: 'sarah',
    userName: 'Sarah M.',
    content: 'CBA earnings beat was bigger than expected — NIM held better than I thought. Worth watching the sector reaction.',
    createdAt: '9:43 AM',
  },
  {
    id: '3',
    userId: 'me',
    userName: 'You',
    content: 'BHP guidance cut has me watching iron ore futures tonight. Pilbara disruption is temporary but Q1 numbers will be soft.',
    createdAt: '9:47 AM',
  },
  {
    id: '4',
    userId: 'james',
    userName: 'James T.',
    content: 'Woodside LNG deal is interesting — $2.35B acquisition doubling capacity. Big equity raise coming.',
    createdAt: '9:52 AM',
  },
  {
    id: '5',
    userId: 'alex',
    userName: 'Alex K.',
    content: 'Gold at $3,298 is insane. Real yields going negative again. Central bank buying not slowing down.',
    createdAt: '10:01 AM',
  },
]

const TEAM_MEMBERS = [
  { id: 'alex',  name: 'Alex K.',  initials: 'AK', color: '#5b8af5' },
  { id: 'sarah', name: 'Sarah M.', initials: 'SM', color: '#22d48a' },
  { id: 'james', name: 'James T.', initials: 'JT', color: '#a78bfa' },
  { id: 'me',    name: 'You',      initials: 'B',  color: '#e8b84b' },
]

function Avatar({ userId, size = 30 }: { userId: string; size?: number }) {
  const member = TEAM_MEMBERS.find((m) => m.id === userId)
  if (!member) return null
  const r = size / 2
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center font-bold"
      style={{
        width: size, height: size, borderRadius: r,
        fontSize: size * 0.33,
        background: `${member.color}18`,
        border: `1.5px solid ${member.color}50`,
        color: member.color,
      }}
    >
      {member.initials}
    </div>
  )
}

export default function TeamsPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [draft, setDraft]       = useState('')
  const bottomRef               = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const text = draft.trim()
    if (!text) return
    const msg: Message = {
      id: String(Date.now()),
      userId: 'me',
      userName: 'You',
      content: text,
      createdAt: new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false }),
    }
    setMessages((prev) => [...prev, msg])
    setDraft('')
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>

      {/* ── Channel header ───────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-4 py-3 flex items-center justify-between"
        style={{
          background: 'rgba(10,16,32,0.95)',
          borderBottom: '1px solid var(--line)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center gap-3">
          {/* Channel avatar */}
          <div
            className="flex items-center justify-center"
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(91,138,245,0.12)',
              border: '1px solid rgba(91,138,245,0.28)',
            }}
          >
            <Users size={16} strokeWidth={1.8} style={{ color: 'var(--blue)' }} />
          </div>

          <div>
            <div className="font-semibold text-[13px]" style={{ letterSpacing: '-0.01em' }}>
              ASX Research Desk
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Circle size={6} fill="var(--green)" style={{ color: 'var(--green)' }} />
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                4 members · 3 online
              </span>
            </div>
          </div>
        </div>

        {/* Member stack */}
        <div className="flex items-center gap-2">
          <div className="flex items-center" style={{ gap: -4 }}>
            {TEAM_MEMBERS.slice(0, 3).map((m, i) => (
              <div
                key={m.id}
                className="flex items-center justify-center font-bold"
                style={{
                  width: 22, height: 22, borderRadius: 11,
                  fontSize: 8,
                  background: `${m.color}20`,
                  border: `1.5px solid ${m.color}60`,
                  color: m.color,
                  marginLeft: i > 0 ? -6 : 0,
                  zIndex: 3 - i,
                  position: 'relative',
                }}
              >
                {m.initials}
              </div>
            ))}
          </div>
          <button style={{ color: 'var(--text-muted)', marginLeft: 4 }}>
            <ChevronRight size={15} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* ── Date divider ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
        <span className="text-[9px] font-mono tracking-widest uppercase" style={{ color: 'var(--text-faint)' }}>
          Today
        </span>
        <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
      </div>

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scroll-y px-4 pb-3 space-y-3">
        {messages.map((msg, idx) => {
          const isMe      = msg.userId === 'me'
          const member    = TEAM_MEMBERS.find((m) => m.id === msg.userId)
          const prevMsg   = idx > 0 ? messages[idx - 1] : null
          const showAvtr  = !isMe && (prevMsg?.userId !== msg.userId)

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar — only shown on first message in a group */}
              {!isMe && (
                <div style={{ width: 30, flexShrink: 0 }}>
                  {showAvtr && <Avatar userId={msg.userId} />}
                </div>
              )}

              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%]`}>
                {/* Sender name */}
                {!isMe && showAvtr && (
                  <span
                    className="text-[10px] font-semibold mb-1 ml-1"
                    style={{ color: member?.color ?? 'var(--text-muted)' }}
                  >
                    {msg.userName}
                  </span>
                )}

                {/* Bubble */}
                <div
                  className="rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed"
                  style={{
                    background: isMe
                      ? 'linear-gradient(135deg, rgba(232,184,75,0.15) 0%, rgba(232,184,75,0.08) 100%)'
                      : 'var(--bg-3)',
                    border: `1px solid ${isMe ? 'rgba(232,184,75,0.28)' : 'var(--line-2)'}`,
                    color: isMe ? 'var(--text-primary)' : 'var(--text-secondary)',
                    borderBottomRightRadius: isMe ? 6 : undefined,
                    borderBottomLeftRadius: !isMe ? 6 : undefined,
                    backdropFilter: 'blur(8px)',
                    boxShadow: isMe
                      ? '0 2px 12px rgba(232,184,75,0.08)'
                      : '0 2px 8px rgba(0,0,0,0.2)',
                  }}
                >
                  {msg.content}
                </div>

                {/* Timestamp */}
                <span
                  className="text-[9.5px] mt-1 mx-1 font-mono"
                  style={{ color: 'var(--text-faint)' }}
                >
                  {msg.createdAt}
                </span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Composer ─────────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex items-center gap-2.5 px-3 py-3"
        style={{
          background: 'rgba(8,12,24,0.96)',
          borderTop: '1px solid var(--line)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <Avatar userId="me" />

        <div
          className="flex-1 flex items-center gap-2 rounded-xl px-3.5 py-2.5"
          style={{
            background: 'var(--bg-3)',
            border: '1px solid var(--line-2)',
            transition: 'border-color 0.2s',
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Share an insight…"
            rows={1}
            className="flex-1 bg-transparent text-[13px] resize-none outline-none"
            style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
              lineHeight: 1.5,
            }}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!draft.trim()}
          className="flex items-center justify-center transition-all disabled:opacity-25"
          style={{
            width: 38, height: 38, borderRadius: 12, flexShrink: 0,
            background: draft.trim()
              ? 'linear-gradient(135deg, #e8b84b 0%, #f5cc5a 100%)'
              : 'var(--bg-4)',
            color: draft.trim() ? '#05081a' : 'var(--text-muted)',
            boxShadow: draft.trim() ? '0 0 16px rgba(232,184,75,0.28)' : 'none',
          }}
        >
          <Send size={15} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
