'use client'

import { useState, useMemo } from 'react'
import {
  Search, ChevronDown, Mail, Bug, Lightbulb, BookOpen, Activity,
  FileText, Shield, Scale, Info, X,
} from 'lucide-react'
import { SettingsScaffold, Group, Row, Modal } from '@/components/settings/ui'

const SUPPORT_EMAIL = 'support@fiscus.app'
const APP_VERSION = 'Beta 0.1.0'

const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is Fiscus?',
    a: 'Fiscus turns Australian financial news, ASX data and RBA decisions into short, AI-written briefings you can read or watch in about 15 seconds. It’s built for analysts, consultants and investors who want signal without the noise.',
  },
  {
    q: 'Is Fiscus financial advice?',
    a: 'No. Fiscus is a news and information service, not a financial adviser. Nothing in the app is personal financial, investment, tax or legal advice. Always do your own research and consider professional advice before making decisions.',
  },
  {
    q: 'Where does the market data come from?',
    a: 'Live FX rates come from the Frankfurter reference feed, and commodities and crypto come from Twelve Data. Figures can be delayed and are shown for information only — they’re not a dealing or execution price.',
  },
  {
    q: 'Why is the focus mostly on the ASX?',
    a: 'Fiscus specialises in Australian markets, with selected global coverage. Some single-stock ASX data is limited during the beta due to licensing, so a few instruments may be unavailable.',
  },
  {
    q: 'How are briefings generated?',
    a: 'Briefings are summarised by AI from trusted, attributed sources. Every card shows where the story came from so you can read the original in full.',
  },
  {
    q: 'How do follows and my feed work?',
    a: 'Following stocks, sectors and sources personalises your feed and powers your alerts. Manage them under Profile → Following, or Settings → Preferences.',
  },
  {
    q: 'Is my data secure?',
    a: 'Passwords are hashed with bcrypt and never stored in plain text. You can add two-factor authentication, export all of your data, or delete your account at any time from Privacy & Security.',
  },
  {
    q: 'How much does Fiscus cost?',
    a: 'Fiscus is free while it’s in beta. Paid plans will be introduced later — beta users will get plenty of notice.',
  },
]

function mailto(subject: string, body = '') {
  const params = new URLSearchParams()
  if (subject) params.set('subject', subject)
  if (body) params.set('body', body)
  return `mailto:${SUPPORT_EMAIL}?${params.toString()}`
}

function diagnostics(): string {
  if (typeof navigator === 'undefined') return ''
  return `\n\n———\nDiagnostics (please keep):\nApp: Fiscus ${APP_VERSION}\nDevice: ${navigator.userAgent}\nTime: ${new Date().toISOString()}`
}

export default function HelpSupportPage() {
  const [query, setQuery]   = useState('')
  const [openFaq, setOpen]  = useState<number | null>(null)
  const [legal, setLegal]   = useState<null | 'disclaimer' | 'privacy' | 'terms' | 'guide'>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return FAQS
    return FAQS.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
  }, [query])

  return (
    <SettingsScaffold eyebrow="Settings" title="Help & Support">
      {/* ── Search ───────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 rounded-xl px-3 mb-5"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', height: 44 }}
      >
        <Search size={15} strokeWidth={2} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help…"
          className="flex-1 bg-transparent outline-none text-[13px]"
          style={{ color: 'var(--text-primary)' }}
        />
        {query && (
          <button onClick={() => setQuery('')}>
            <X size={13} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
          </button>
        )}
      </div>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] font-mono" style={{ color: 'var(--text-muted)' }}>
            Frequently asked
          </span>
          <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl p-5 text-center text-[12px]" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text-muted)' }}>
            No results for “{query}”. Try the contact options below.
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)', background: 'var(--bg-2)' }}>
            {filtered.map((f, i) => {
              const realIndex = FAQS.indexOf(f)
              const isOpen = openFaq === realIndex
              return (
                <div key={f.q} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <button
                    onClick={() => setOpen(isOpen ? null : realIndex)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                  >
                    <span className="flex-1 text-[13px] font-medium">{f.q}</span>
                    <ChevronDown
                      size={15} strokeWidth={2}
                      style={{ color: 'var(--text-muted)', flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 -mt-1">
                      <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.a}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Contact ──────────────────────────────────────────────────────── */}
      <Group label="Get in touch" footer={`We usually reply within a couple of business days · ${SUPPORT_EMAIL}`}>
        <Row icon={Mail} label="Email support" sub="Questions about your account or billing" chevron
          onClick={() => { window.location.href = mailto('Fiscus support request') }}
        />
        <Row icon={Bug} label="Report a problem" sub="Something broken or not loading?" chevron
          onClick={() => { window.location.href = mailto('Fiscus bug report', `Describe what happened:${diagnostics()}`) }}
        />
        <Row icon={Lightbulb} label="Request a feature" sub="Tell us what would make Fiscus better" chevron
          onClick={() => { window.location.href = mailto('Fiscus feature request', 'I’d love to see…') }}
        />
      </Group>

      {/* ── Resources ────────────────────────────────────────────────────── */}
      <Group label="Resources">
        <Row icon={BookOpen} label="Getting started guide" sub="Make the most of Fiscus in 5 minutes" chevron
          onClick={() => setLegal('guide')}
        />
        <Row icon={Activity} label="System status" sub="All systems operational"
          right={<span className="live-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />}
        />
      </Group>

      {/* ── Legal ────────────────────────────────────────────────────────── */}
      <Group label="Legal">
        <Row icon={Info} label="Important disclaimer" chevron onClick={() => setLegal('disclaimer')} />
        <Row icon={Shield} label="Privacy policy" chevron onClick={() => setLegal('privacy')} />
        <Row icon={Scale} label="Terms of service" chevron onClick={() => setLegal('terms')} />
      </Group>

      {/* ── About ────────────────────────────────────────────────────────── */}
      <Group label="About">
        <Row icon={FileText} label="Version" value={APP_VERSION} />
      </Group>

      <p className="text-center text-[11px] mt-2" style={{ color: 'var(--text-faint)' }}>
        Fiscus · Australian Financial Intelligence · Made in Australia 🇦🇺
      </p>

      {/* ── Legal / guide modals ─────────────────────────────────────────── */}
      <Modal open={legal === 'disclaimer'} onClose={() => setLegal(null)} title="Important disclaimer">
        <LegalBody>
          <p><strong style={{ color: 'var(--text-primary)' }}>Fiscus is a news and information service — not financial advice.</strong></p>
          <p>The briefings, summaries, prices and data in Fiscus are general information only. They don’t take into account your objectives, financial situation or needs, and they are not a recommendation to buy, sell or hold any security or product.</p>
          <p>Market data may be delayed or incomplete and must not be relied on for trading or execution. AI-generated summaries can contain errors — always check the original source, which is linked on every briefing.</p>
          <p>Before acting on anything you read here, consider seeking advice from a licensed financial adviser. You are responsible for your own decisions.</p>
        </LegalBody>
      </Modal>

      <Modal open={legal === 'privacy'} onClose={() => setLegal(null)} title="Privacy policy">
        <LegalBody>
          <p>This is a short, beta-stage summary of how Fiscus handles your data.</p>
          <p><strong style={{ color: 'var(--text-primary)' }}>What we store:</strong> your account details (name, email), your follows, saves and activity used to personalise your feed.</p>
          <p><strong style={{ color: 'var(--text-primary)' }}>Security:</strong> passwords are hashed with bcrypt and never stored in plain text. You can enable two-factor authentication for extra protection.</p>
          <p><strong style={{ color: 'var(--text-primary)' }}>Your controls:</strong> you can export all of your data or permanently delete your account at any time from Privacy &amp; Security.</p>
          <p>We don’t sell your personal data. A full policy will be published as Fiscus leaves beta.</p>
        </LegalBody>
      </Modal>

      <Modal open={legal === 'terms'} onClose={() => setLegal(null)} title="Terms of service">
        <LegalBody>
          <p>By using Fiscus during the beta you agree to these short terms.</p>
          <p>Fiscus is provided “as is” while in beta and may change, break or be unavailable. Don’t rely on it as your only source for financial decisions.</p>
          <p>Use Fiscus lawfully and don’t attempt to scrape, resell or disrupt the service. Content and branding remain the property of Fiscus and its sources.</p>
          <p>Your access can be suspended for misuse. Full terms will be published before any paid plans launch.</p>
        </LegalBody>
      </Modal>

      <Modal open={legal === 'guide'} onClose={() => setLegal(null)} title="Getting started">
        <LegalBody>
          <p><strong style={{ color: 'var(--text-primary)' }}>1 · Build your feed.</strong> Follow stocks, sectors and sources in Profile → Following, or pick topics in Settings → Preferences.</p>
          <p><strong style={{ color: 'var(--text-primary)' }}>2 · Watch your briefings.</strong> Swipe through 15-second briefings in the Feed. Tap a source badge to read the full story.</p>
          <p><strong style={{ color: 'var(--text-primary)' }}>3 · Stay alerted.</strong> Turn on the alerts you care about in Settings → Notifications — price moves, breaking news and RBA decisions.</p>
          <p><strong style={{ color: 'var(--text-primary)' }}>4 · Save &amp; share.</strong> Bookmark briefings to your library and share them with your teams.</p>
        </LegalBody>
      </Modal>
    </SettingsScaffold>
  )
}

function LegalBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-3 text-[12.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
      {children}
    </div>
  )
}
