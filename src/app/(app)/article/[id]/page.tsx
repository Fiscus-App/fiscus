'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react'

interface Article {
  id: string
  title: string
  summary: string | null
  bodyText: string | null
  url: string
  author: string | null
  publishedAt: string
  sector: string | null
  relatedTickers: string[]
  source: string
  sourceUrl: string | null
}

interface RelatedArticle {
  id: string
  title: string
  publishedAt: string
  source: string
}

interface ArticleData {
  article: Article
  related: RelatedArticle[]
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return 'Just now'
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return `${Math.floor(d / 7)}w ago`
}

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<ArticleData | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'notfound' | 'error'>('loading')

  const load = useCallback(async () => {
    setState('loading')
    try {
      const res = await fetch(`/api/articles/${id}`)
      if (res.status === 404) { setState('notfound'); return }
      if (!res.ok) { setState('error'); return }
      const json = await res.json()
      setData(json)
      setState('ok')
    } catch {
      setState('error')
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const Header = (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50, height: 58, display: 'flex',
      alignItems: 'center', padding: '0 16px', gap: 12,
      background: 'rgba(5,8,26,0.9)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
    }}>
      <button onClick={() => router.back()} aria-label="Back"
        style={{
          background: 'var(--bg-3)', border: 'none', borderRadius: 10, width: 36, height: 36,
          cursor: 'pointer', color: 'var(--text-1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        <ArrowLeft size={18} />
      </button>
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Article</span>
    </header>
  )

  if (state === 'loading') {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg-1)' }}>
        {Header}
        <div style={{ padding: '24px 20px' }}>
          {[60, 90, 40].map((w, i) => (
            <div key={i} style={{ height: i === 1 ? 24 : 14, width: w + '%', background: 'var(--bg-3)', borderRadius: 8, marginBottom: 14, opacity: 0.6 }} />
          ))}
        </div>
      </div>
    )
  }

  if (state === 'notfound' || state === 'error' || !data) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--bg-1)' }}>
        {Header}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 40, textAlign: 'center', minHeight: '50dvh' }}>
          <p style={{ color: 'var(--text-1)', fontSize: 16, fontWeight: 700, margin: 0 }}>
            {state === 'notfound' ? 'Article not found' : 'Couldn’t load this article'}
          </p>
          <p style={{ color: 'var(--text-2)', fontSize: 13, margin: 0, maxWidth: 280 }}>
            {state === 'notfound'
              ? 'This briefing may have been removed or isn’t available yet.'
              : 'Something went wrong fetching this article.'}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            {state === 'error' && (
              <button onClick={load}
                style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', color: 'var(--text-1)', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={13} /> Retry
              </button>
            )}
            <button onClick={() => router.push('/feed')}
              style={{ background: 'var(--gold)', border: 'none', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', color: '#05081a', fontSize: 13, fontWeight: 700 }}>
              Back to feed
            </button>
          </div>
        </div>
      </div>
    )
  }

  const a = data.article

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-1)', paddingBottom: 90 }}>
      {Header}

      <article style={{ padding: '24px 20px 0' }}>
        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {a.sector && (
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 6, background: 'rgba(232,184,75,0.10)', color: 'var(--gold)', border: '1px solid rgba(232,184,75,0.20)' }}>
              {a.sector}
            </span>
          )}
          <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>{a.source}</span>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>· {relativeTime(a.publishedAt)}</span>
        </div>

        {/* Title */}
        <h1 style={{ margin: '0 0 16px', fontSize: 24, fontWeight: 800, lineHeight: 1.25, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>
          {a.title}
        </h1>

        {/* Related tickers */}
        {a.relatedTickers.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            {a.relatedTickers.slice(0, 8).map(t => (
              <button key={t} onClick={() => router.push(`/asset/${encodeURIComponent(t)}`)}
                style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: 'var(--bg-3)', color: 'var(--gold)', border: '1px solid rgba(232,184,75,0.22)', cursor: 'pointer' }}>
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Summary */}
        {a.summary && (
          <p style={{ margin: '0 0 20px', fontSize: 16, lineHeight: 1.7, color: 'var(--text-1)', fontWeight: 500 }}>
            {a.summary}
          </p>
        )}

        {/* Body */}
        {a.bodyText && (
          <div style={{ marginBottom: 24 }}>
            {a.bodyText.split('\n').filter(p => p.trim()).map((p, i) => (
              <p key={i} style={{ margin: '0 0 14px', fontSize: 15, lineHeight: 1.7, color: 'var(--text-2)' }}>{p}</p>
            ))}
          </div>
        )}

        {/* Source link */}
        <a href={a.url} target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--gold)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          Read full article at {a.source} <ExternalLink size={14} />
        </a>
      </article>

      {/* Related articles */}
      {data.related.length > 0 && (
        <div style={{ padding: '32px 20px 0' }}>
          <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Related
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
            {data.related.map(r => (
              <button key={r.id} onClick={() => router.push(`/article/${r.id}`)}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: 'var(--bg-2)', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', padding: '14px 16px' }}>
                <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.4 }}>{r.title}</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.source}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>· {relativeTime(r.publishedAt)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
