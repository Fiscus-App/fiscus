'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// ── Types ──────────────────────────────────────────────────────────────────────

interface AssetProfile {
  ticker:      string
  name:        string
  exchange?:   string
  sector:      string
  sectorColor: string
  type:        'STOCK' | 'COMMODITY' | 'INDEX' | 'FX' | 'MONETARY_POLICY'
  price:       number
  change:      number
  changeAbs:   number
  currency:    string
  marketCap?:  string
  volume?:     string
  high52w:     number
  low52w:      number
  peRatio?:    number
  dividend?:   number
  description: string
  links?:      { label: string; url: string }[]
}

interface ChartPoint {
  week:  number   // 1-52
  price: number
}

interface Article {
  id:          string
  title:       string
  summary:     string | null
  publishedAt: string
  source:      string
  sector:      string | null
}

interface AssetData {
  profile:  AssetProfile
  chart:    number[]
  articles: Article[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h    = Math.floor(diff / 3_600_000)
  if (h < 1) return 'Just now'
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return `${Math.floor(d / 7)}w ago`
}

function formatPrice(price: number, currency: string, type: string): string {
  if (type === 'FX') return price.toFixed(4)
  if (currency === '%') return `${price.toFixed(2)}%`
  const locale = currency === 'USD' ? 'en-US' : 'en-AU'
  return new Intl.NumberFormat(locale, {
    style: 'currency', currency,
    minimumFractionDigits: price >= 100 ? 0 : 2,
    maximumFractionDigits: price >= 100 ? 0 : 2,
  }).format(price)
}

function typeLabel(type: string): string {
  switch (type) {
    case 'STOCK':            return 'Stock'
    case 'COMMODITY':        return 'Commodity'
    case 'INDEX':            return 'Index'
    case 'FX':               return 'FX Rate'
    case 'MONETARY_POLICY':  return 'Interest Rate'
    default:                 return type
  }
}

// Month labels for 52-week chart
const MONTH_LABELS = ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun']

// Custom tooltip for recharts
function ChartTooltip({ active, payload, currency, type }: {
  active?: boolean
  payload?: { value: number }[]
  currency: string
  type: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-2)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '6px 12px', fontSize: 13,
      color: 'var(--text-1)',
    }}>
      {formatPrice(payload[0].value, currency, type)}
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AssetPage() {
  const { ticker } = useParams<{ ticker: string }>()
  const router     = useRouter()
  const [data, setData]       = useState<AssetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<'1M'|'3M'|'6M'|'YTD'>('YTD')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/asset/${ticker}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [ticker])

  useEffect(() => { load() }, [load])

  // ── Slice chart by tab ─────────────────────────────────────────────────────
  const chartPoints = (): ChartPoint[] => {
    if (!data) return []
    const all  = data.chart
    const cut  = tab === '1M' ? 48 : tab === '3M' ? 40 : tab === '6M' ? 26 : 0
    const slice = all.slice(cut)
    return slice.map((price, i) => ({ week: cut + i + 1, price }))
  }

  const pts = chartPoints()
  const minP = Math.min(...pts.map(p => p.price))
  const maxP = Math.max(...pts.map(p => p.price))

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-1)', padding: '0 0 90px' }}>
      {/* header skeleton */}
      <div style={{ height: 58, background: 'var(--bg-2)', borderBottom: '1px solid var(--border)' }} />
      <div style={{ padding: '24px 20px' }}>
        {[80, 140, 60, 30].map((w, i) => (
          <div key={i} style={{
            height: i === 1 ? 28 : 16, width: w + '%', background: 'var(--bg-3)',
            borderRadius: 8, marginBottom: 12, opacity: 0.6,
          }} />
        ))}
      </div>
    </div>
  )

  if (!data) return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-2)' }}>Asset not found</p>
    </div>
  )

  const { profile, articles } = data
  const up = profile.change >= 0

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-1)', paddingBottom: 90 }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        height: 58, display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 12,
        background: 'rgba(5,8,26,0.9)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <button
          onClick={() => router.back()}
          style={{
            background: 'var(--bg-3)', border: 'none', borderRadius: 10,
            width: 36, height: 36, cursor: 'pointer', color: 'var(--text-1)',
            fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>
            {profile.ticker}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-2)' }}>
            {profile.exchange ?? ''} · {typeLabel(profile.type)}
          </p>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '3px 8px',
          borderRadius: 6, background: 'var(--bg-3)',
          color: profile.sectorColor, border: `1px solid ${profile.sectorColor}30`,
        }}>
          {profile.sector}
        </span>
      </header>

      {/* ── Hero: price + change ─────────────────────────────────────────────── */}
      <div style={{ padding: '24px 20px 0' }}>

        <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>
          {profile.name}
        </p>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 42, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>
            {formatPrice(profile.price, profile.currency, profile.type)}
          </span>
          <span style={{
            fontSize: 15, fontWeight: 700, paddingBottom: 4,
            color: up ? '#2ed494' : '#ff4f4f',
          }}>
            {up ? '▲' : '▼'} {Math.abs(profile.change).toFixed(2)}%
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{
            fontSize: 13, color: up ? '#2ed494' : '#ff4f4f', fontWeight: 600,
          }}>
            {up ? '+' : ''}{profile.changeAbs >= 0 && profile.change < 0 ? '-' : ''}
            {formatPrice(Math.abs(profile.changeAbs), profile.currency, profile.type)} today
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 6px',
            borderRadius: 4, background: '#e8b84b20', color: '#e8b84b',
            letterSpacing: '0.04em',
          }}>
            SIMULATED
          </span>
        </div>
      </div>

      {/* ── Chart ───────────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 0 0' }}>

        {/* Tab row */}
        <div style={{ display: 'flex', gap: 4, padding: '0 20px 16px' }}>
          {(['1M','3M','6M','YTD'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, height: 32, borderRadius: 8, border: 'none',
                cursor: 'pointer', fontSize: 12, fontWeight: 700,
                background: tab === t ? 'var(--gold)' : 'var(--bg-3)',
                color:      tab === t ? '#05081a'      : 'var(--text-2)',
                transition: 'all 0.15s',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Area chart */}
        <div style={{ height: 200, paddingRight: 4 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pts} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={up ? '#2ed494' : '#ff4f4f'} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={up ? '#2ed494' : '#ff4f4f'} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="week"
                tick={false}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[minP * 0.97, maxP * 1.03]}
                hide
              />
              <Tooltip
                content={<ChartTooltip currency={profile.currency} type={profile.type} />}
                cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke={up ? '#2ed494' : '#ff4f4f'}
                strokeWidth={2}
                fill="url(#priceGrad)"
                dot={false}
                activeDot={{ r: 4, fill: up ? '#2ed494' : '#ff4f4f', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Month labels */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '6px 20px 0', marginTop: 4,
        }}>
          {MONTH_LABELS.map(m => (
            <span key={m} style={{ fontSize: 10, color: 'var(--text-3)' }}>{m}</span>
          ))}
        </div>
      </div>

      {/* ── Key Stats ───────────────────────────────────────────────────────── */}
      <div style={{ padding: '24px 20px 0' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 1, background: 'var(--border)',
          borderRadius: 14, overflow: 'hidden',
          border: '1px solid var(--border)',
        }}>
          {[
            { label: '52W High',   value: formatPrice(profile.high52w, profile.currency, profile.type) },
            { label: '52W Low',    value: formatPrice(profile.low52w,  profile.currency, profile.type) },
            ...(profile.marketCap ? [{ label: 'Market Cap', value: profile.marketCap }] : []),
            ...(profile.volume    ? [{ label: 'Volume',     value: profile.volume    }] : []),
            ...(profile.peRatio   ? [{ label: 'P/E Ratio',  value: profile.peRatio.toFixed(1) + 'x' }] : []),
            ...(profile.dividend  ? [{ label: 'Div Yield',  value: profile.dividend.toFixed(1) + '%' }] : []),
          ].map(stat => (
            <div key={stat.label} style={{
              padding: '14px 16px',
              background: 'var(--bg-2)',
            }}>
              <p style={{ margin: '0 0 3px', fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>
                {stat.label}
              </p>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 52-week range bar ───────────────────────────────────────────────── */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>52W Range</span>
          <span style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600 }}>
            {formatPrice(profile.low52w, profile.currency, profile.type)} – {formatPrice(profile.high52w, profile.currency, profile.type)}
          </span>
        </div>
        <div style={{
          height: 6, background: 'var(--bg-3)', borderRadius: 3, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: `linear-gradient(90deg, var(--bg-3) 0%, ${up ? '#2ed494' : '#ff4f4f'} 100%)`,
            width: `${((profile.price - profile.low52w) / (profile.high52w - profile.low52w) * 100).toFixed(0)}%`,
          }} />
        </div>
      </div>

      {/* ── About ───────────────────────────────────────────────────────────── */}
      <div style={{ padding: '24px 20px 0' }}>
        <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          About
        </p>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-1)', lineHeight: 1.7 }}>
          {profile.description}
        </p>

        {/* Links */}
        {profile.links?.length ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {profile.links.map(l => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '6px 12px', borderRadius: 8,
                  background: 'var(--bg-3)', border: '1px solid var(--border)',
                  color: 'var(--gold)', fontSize: 12, fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                ↗ {l.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>

      {/* ── Related Articles ─────────────────────────────────────────────────── */}
      <div style={{ padding: '28px 20px 0' }}>
        <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Related Articles
        </p>

        {articles.length === 0 ? (
          <div style={{
            padding: 24, borderRadius: 14, background: 'var(--bg-2)',
            border: '1px solid var(--border)', textAlign: 'center',
          }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-3)' }}>
              No articles yet — check back as coverage builds.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {articles.map((article, idx) => (
              <button
                key={article.id}
                onClick={() => router.push(`/feed?article=${article.id}`)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: 'var(--bg-2)', border: 'none', cursor: 'pointer',
                  padding: '14px 16px',
                  borderRadius: idx === 0 ? '14px 14px 0 0' : idx === articles.length - 1 ? '0 0 14px 14px' : 0,
                  borderTop: idx === 0 ? '1px solid var(--border)' : '1px solid var(--border)',
                  borderBottom: idx === articles.length - 1 ? '1px solid var(--border)' : 'none',
                  borderLeft: '1px solid var(--border)',
                  borderRight: '1px solid var(--border)',
                }}
              >
                <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.4 }}>
                  {article.title}
                </p>
                {article.summary && (
                  <p style={{
                    margin: '0 0 8px', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {article.summary}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {article.sector && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                      background: 'var(--bg-3)', color: 'var(--text-3)',
                    }}>
                      {article.sector}
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{article.source}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>
                    {relativeTime(article.publishedAt)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
