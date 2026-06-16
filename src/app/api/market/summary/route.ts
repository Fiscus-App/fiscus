/**
 * /api/market/summary
 *
 * Primary:  Twelve Data REST API  — stocks, indices, commodities (API key in Vercel env)
 * FX:       Frankfurter (ECB)     — AUD FX rates, free, no key, confirmed working
 */

import { NextResponse } from 'next/server'
import { fetchAUDRates } from '@/lib/market/frankfurter'

const TD_BASE = 'https://api.twelvedata.com'

// All symbols we need in one batch — 1 credit each
const SYMBOLS = [
  // Indices
  'AXJO', 'SPX', 'NI225', 'UKX',
  // Commodities
  'XAU/USD', 'XAG/USD', 'WTI/USD',
  // ASX stocks
  'CBA:ASX', 'BHP:ASX', 'CSL:ASX', 'NAB:ASX',
  'WBC:ASX', 'WDS:ASX', 'RIO:ASX', 'ANZ:ASX',
  'FMG:ASX', 'MQG:ASX',
]

interface TDQuote {
  symbol:          string
  name?:           string
  close?:          string
  previous_close?: string
  change?:         string
  percent_change?: string
  status?:         string
  code?:           number
}

async function fetchTD(): Promise<Map<string, TDQuote>> {
  const key = process.env.TWELVE_DATA_API_KEY
  if (!key) {
    console.error('[TD] TWELVE_DATA_API_KEY not set in env')
    return new Map()
  }

  try {
    const url = `${TD_BASE}/quote?symbol=${encodeURIComponent(SYMBOLS.join(','))}&apikey=${key}`
    console.log('[TD] fetching', SYMBOLS.length, 'symbols')
    const res = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) {
      console.error('[TD] HTTP error', res.status)
      return new Map()
    }
    const json = await res.json() as Record<string, TDQuote>
    const out = new Map<string, TDQuote>()
    for (const [sym, q] of Object.entries(json)) {
      if (q && q.status !== 'error' && !q.code && q.close) {
        out.set(sym, q)
      } else {
        console.warn('[TD] bad quote for', sym, JSON.stringify(q).slice(0, 80))
      }
    }
    console.log('[TD] got', out.size, 'valid quotes out of', SYMBOLS.length)
    return out
  } catch (e) {
    console.error('[TD] fetch threw:', e)
    return new Map()
  }
}

function price(q: TDQuote | undefined): number | null {
  if (!q) return null
  const v = parseFloat(q.close ?? '')
  return isNaN(v) ? null : v
}
function changePct(q: TDQuote | undefined): number | null {
  if (!q) return null
  const v = parseFloat(q.percent_change ?? '')
  return isNaN(v) ? null : v
}
function changeAbs(q: TDQuote | undefined): number | null {
  if (!q) return null
  const v = parseFloat(q.change ?? '')
  return isNaN(v) ? null : v
}

export async function GET() {
  const [quotes, fxRates] = await Promise.all([
    fetchTD(),
    fetchAUDRates().catch(() => null),
  ])

  // ── Indices ────────────────────────────────────────────────────────────────
  const indices = [
    { name: 'ASX 200',   sym: 'AXJO'  },
    { name: 'S&P 500',   sym: 'SPX'   },
    { name: 'Nikkei',    sym: 'NI225' },
    { name: 'FTSE 100',  sym: 'UKX'   },
  ].map(({ name, sym }) => ({
    name,
    value:     price(quotes.get(sym)),
    change:    changePct(quotes.get(sym)),
    changeAbs: changeAbs(quotes.get(sym)),
  }))

  // ── Commodities ────────────────────────────────────────────────────────────
  const commodities = [
    { name: 'Gold',     sym: 'XAU/USD', unit: '/oz'  },
    { name: 'Silver',   sym: 'XAG/USD', unit: '/oz'  },
    { name: 'WTI Oil',  sym: 'WTI/USD', unit: '/bbl' },
  ].map(({ name, sym, unit }) => ({
    name,
    unit,
    value:  price(quotes.get(sym)),
    change: changePct(quotes.get(sym)),
  }))

  // ── FX — Frankfurter (free, no key, already confirmed working) ─────────────
  const rates = fxRates?.rates ?? {}
  const fx = [
    { pair: 'AUD/USD', value: rates.USD ?? null },
    { pair: 'AUD/CNY', value: rates.CNY ?? null },
    { pair: 'AUD/JPY', value: rates.JPY ?? null },
    { pair: 'AUD/EUR', value: rates.EUR ?? null },
  ].map(f => ({ ...f, change: null as number | null }))

  // ── ASX Stocks ─────────────────────────────────────────────────────────────
  const STOCKS = [
    { id: 'CBA', sym: 'CBA:ASX', name: 'Commonwealth Bank'  },
    { id: 'BHP', sym: 'BHP:ASX', name: 'BHP Group'          },
    { id: 'CSL', sym: 'CSL:ASX', name: 'CSL Limited'        },
    { id: 'NAB', sym: 'NAB:ASX', name: 'National Australia' },
    { id: 'WBC', sym: 'WBC:ASX', name: 'Westpac Banking'    },
    { id: 'WDS', sym: 'WDS:ASX', name: 'Woodside Energy'    },
    { id: 'RIO', sym: 'RIO:ASX', name: 'Rio Tinto'          },
    { id: 'ANZ', sym: 'ANZ:ASX', name: 'ANZ Group'          },
    { id: 'FMG', sym: 'FMG:ASX', name: 'Fortescue'          },
    { id: 'MQG', sym: 'MQG:ASX', name: 'Macquarie Group'    },
  ]

  const topMovers = STOCKS.map(({ id, sym, name }) => ({
    ticker:    id,
    name,
    price:     price(quotes.get(sym)),
    change:    changePct(quotes.get(sym)),
    changeAbs: changeAbs(quotes.get(sym)),
  }))

  // ASX 200 for hero
  const asxQ = quotes.get('AXJO')
  const asx = asxQ
    ? { price: parseFloat(asxQ.close!), change: parseFloat(asxQ.percent_change ?? '0'), changeAbs: parseFloat(asxQ.change ?? '0') }
    : null

  const hasAnyLive =
    indices.some(i => i.value !== null) ||
    topMovers.some(m => m.price !== null) ||
    fx.some(f => f.value !== null)

  console.log('[summary] hasAnyLive:', hasAnyLive, '| TD quotes:', quotes.size, '| FX:', !!fxRates)

  return NextResponse.json(
    { indices, commodities, fx, topMovers, asx, meta: { fetchedAt: new Date().toISOString(), hasAnyLive, dataSource: 'twelvedata+frankfurter' } },
    { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=30' } }
  )
}
