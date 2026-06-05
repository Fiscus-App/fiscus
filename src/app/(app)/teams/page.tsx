'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Users, ChevronRight } from 'lucide-react'

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
  { id: 'alex', name: 'Alex K.', initials: 'AK', color: '#5b8af5' },
  { id: 'sarah', name: 'Sarah M.', initials: 'SM', color: '#2ed494' },
  { id: 'james', name: 'James T.', initials: 'JT', color: '#a78bfa' },
  { id: 'me', name: 'You', initials: 'B', color: '#d4a843' },
]

function Avatar({ userId }: { userId: string }) {
  const member = TEAM_MEMBERS.find((m) => m.id === userId)
  if (!member) return null
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
      style={{ background: `${member.color}22`, border: `1.5px solid ${member.color}55`, color: member.color }}
    >
      {member.initials}
    </div>
  )
}

export default function TeamsPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

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

      {/* Team header */}
      <div
        className="flex-shrink-0 px-4 py-3 flex items-center justify-between"
        style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--line)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'var(--blue-a)', border: '1px solid rgba(91,138,245,0.25)' }}
          >
            <Users size={15} strokeWidth={2} style={{ color: 'var(--blue)' }} />
          </div>
          <div>
            <div className="font-semibold text-[13px]">ASX Research Desk</div>
            <div className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
              4 members · active now
            </div>
          </div>
        </div>
        <button style={{ color: 'var(--text-muted)' }}>
          <ChevronRight size={16} strokeWidth={2} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scroll-y px-4 py-3 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.userId === 'me'
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
              {!isMe && <Avatar userId={msg.userId} />}
              <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[78%]`}>
                {!isMe && (
                  <span className="text-[10px] font-semibold mb-1 ml-1" style={{ color: 'var(--text-muted)' }}>
                    {msg.userName}
                  </span>
                )}
                <div
                  className="rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed"
                  style={{
                    background: isMe ? 'var(--gold-a)' : 'var(--bg-3)',
                    border: `1px solid ${isMe ? 'var(--gold-b)' : 'var(--line)'}`,
                    color: isMe ? 'var(--text-primary)' : 'var(--text-secondary)',
                    borderBottomRightRadius: isMe ? 6 : undefined,
                    borderBottomLeftRadius: !isMe ? 6 : undefined,
                  }}
                >
                  {msg.content}
                </div>
                <span className="text-[9.5px] mt-1 mx-1 font-mono" style={{ color: 'var(--text-faint)' }}>
                  {msg.createdAt}
                </span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div
        className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5"
        style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--line)' }}
      >
        <Avatar userId="me" />
        <div
          className="flex-1 flex items-center rounded-xl px-3 py-2"
          style={{ background: 'var(--bg-3)', border: '1px solid var(--line-2)' }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Share an insight..."
            rows={1}
            className="flex-1 bg-transparent text-[13px] resize-none outline-none placeholder:text-text-muted"
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
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
          style={{
            background: draft.trim() ? 'var(--gold)' : 'var(--bg-4)',
            color: draft.trim() ? '#07091a' : 'var(--text-muted)',
          }}
        >
          <Send size={14} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
