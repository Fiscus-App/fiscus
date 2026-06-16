/**
 * GET /api/market/summary  —  Edge Runtime
 *
 * Single source of truth for the Markets page + ticker tape. Composes three
 * upstream providers, each used only where it actually works:
 *
 *   FX            Twelve Data (real % change)  →  Frankfurter (ECB rate, no change)
 *   Commodities   Twelve Data (XAU/XAG/WTI)    →  Stooq CSV
 *   Indices       Stooq CSV                    (TD free tier can't serve indices)
 *   ASX stocks    Stooq CSV                    (TD free tier can't serve ASX equities)
 *
 * Edge runtime is used because Stooq/Frankfurter are reliable from Cloudflare
 * edge IPs (unlike AWS Lambda IPs). The Twelve Data API key is read server-side
 * only (process.env.TWELVE_DATA_API_KEY) and never reaches the client.
 *
 * The response is a typed, backward-compatible superset of the old shape: every
 * field the page/ticker previously read is still present; we add per-row
 * `source` provenance and richer `meta`. Partial upstream failures degrade
 * gracefully (null values + honest source labels) — the route never throws a
 * 500 for missing data and never presents stale/fallback data as "live".
 */

export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { fetchTwelveDataQuotes } from '@/lib/market/twelvedata'
import { fetchStooqQuotes } from '@/lib/market/stooq'
import { fetchAUDRates } from '@/lib/market/frankfurter'
import type {
  MarketSource,
  MarketSummaryResponse,
  IndexRow,
  CommodityRow,
  FXRow,
  MoverRow,
} from '@/lib/market/types'

// ─── Catalogue ───────────────────────────────────────────────────────────────

const FX_PAIRS = [
  { pair: 'AUD/USD', td: 'AUD/USD', ff: 'USD' },
  { pair: 'AUD/CNY', td: 'AUD/CNY', ff: 'CNY' },
  { pair: 'AUD/JPY', td: 'AUD/JPY', ff: 'JPY' },
  { pair: 'AUD/EUR', td: 'AUD/EUR', ff: 'EUR' },
] as const

const COMMODITIES = [
  { name: 'Gold',    unit: '/oz',  td: 'XAU/USD', stooq: 'xauusd' },
  { name: 'Silver',  unit: '/oz',  td: 'XAG/USD', stooq: 'xagusd' },
  { name: 'WTI Oil', unit: '/bbl', td: 'WTI/USD', stooq: 'cl.f'   },
] as const

const INDICES = [
  { name: 'ASX 200',  stooq: '^axjo' },
  { name: 'S&P 500',  stooq: '^spx'  },
  { name: 'Nikkei',   stooq: '^n225' },
  { name: 'FTSE 100', stooq: '^ftse' },
] as const

const STOCKS = [
  { ticker: 'CBA', stooq: 'cba.au', name: 'Commonwealth Bank'   },
  { ticker: 'BHP', stooq: 'bhp.au', name: 'BHP Group'           },
  { ticker: 'CSL', stooq: 'csl.au', name: 'CSL Limited'         },
  { ticker: 'NAB', stooq: 'nab.au', name: 'National Australia'  },
  { ticker: 'WBC', stooq: 'wbc.au', name: 'Westpac Banking'     },
  { ticker: 'WDS', stooq: 'wds.au', name: 'Woodside Energy'     },
  { ticker: 'RIO', stooq: 'rio.au', name: 'Rio Tinto'           },
  { ticker: 'ANZ', stooq: 'anz.au', name: 'ANZ Group'           },
  { ticker: 'FMG', stooq: 'fmg.au', name: 'Fortescue'           },
  { ticker: 'MQG', stooq: 'mqg.au', name: 'Macquarie Group'     },
] as const

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function GET() {
  const [tdFx, tdCmd, idxMap, stkMap, cmdStooqMap, fxRates] = await Promise.all([
    fetchTwelveDataQuotes(FX_PAIRS.map(f => f.td)),
    fetchTwelveDataQuotes(COMMODITIES.map(c => c.td)),
    fetchStooqQuotes(INDICES.map(i => ({ id: i.name, sym: i.stooq }))),
    fetchStooqQuotes(STOCKS.map(s => ({ id: s.ticker, sym: s.stooq }))),
    fetchStooqQuotes(COMMODITIES.map(c => ({ id: c.name, sym: c.stooq }))),
    fetchAUDRates().catch(() => null),
  ])

  const tdRateLimited = tdFx.status === 'rate_limited' || tdCmd.status === 'rate_limited'
  const tdKeyPresent  = tdFx.status !== 'no_key'

  // ── FX: Twelve Data (with % change) → Frankfurter (rate only) ──────────────
  const fx: FXRow[] = FX_PAIRS.map(f => {
    const q = tdFx.quotes.get(f.td)
    if (q) return { pair: f.pair, value: q.price, change: q.change, source: 'twelvedata' }
    const rate = fxRates?.rates?.[f.ff]
    if (typeof rate === 'number') return { pair: f.pair, value: rate, change: null, source: 'frankfurter' }
    return { pair: f.pair, value: null, change: null, source: 'none' }
  })

  // ── Commodities: Twelve Data → Stooq ───────────────────────────────────────
  const commodities: CommodityRow[] = COMMODITIES.map(c => {
    const q = tdCmd.quotes.get(c.td)
    if (q) return { name: c.name, unit: c.unit, value: q.price, change: q.change, source: 'twelvedata' }
    const s = cmdStooqMap.get(c.name)
    if (s) return { name: c.name, unit: c.unit, value: s.price, change: s.change, source: 'stooq' }
    return { name: c.name, unit: c.unit, value: null, change: null, source: 'none' }
  })

  // ── Indices: Stooq only ────────────────────────────────────────────────────
  const indices: IndexRow[] = INDICES.map(i => {
    const q = idxMap.get(i.name)
    return {
      name:      i.name,
      value:     q?.price     ?? null,
      change:    q?.change    ?? null,
      changeAbs: q?.changeAbs ?? null,
      source:    q ? 'stooq' : 'none',
    }
  })

  // ── ASX stocks: Stooq only ─────────────────────────────────────────────────
  const topMovers: MoverRow[] = STOCKS.map(s => {
    const q = stkMap.get(s.ticker)
    return {
      ticker:    s.ticker,
      name:      s.name,
      price:     q?.price     ?? null,
      change:    q?.change    ?? null,
      changeAbs: q?.changeAbs ?? null,
      source:    q ? 'stooq' : 'none',
    }
  })

  // ── ASX 200 hero ───────────────────────────────────────────────────────────
  const asxQ = idxMap.get('ASX 200')
  const asx = asxQ ? { price: asxQ.price, change: asxQ.change, changeAbs: asxQ.changeAbs } : null

  // ── Provenance + liveness ──────────────────────────────────────────────────
  const pick = (rows: { source: MarketSource }[], order: MarketSource[]): MarketSource =>
    order.find(s => rows.some(r => r.source === s)) ?? 'none'

  const hasAnyLive =
    fx.some(r => r.value !== null) ||
    commodities.some(r => r.value !== null) ||
    indices.some(r => r.value !== null) ||
    topMovers.some(r => r.price !== null)

  const payload: MarketSummaryResponse = {
    asx,
    indices,
    commodities,
    fx,
    topMovers,
    meta: {
      fetchedAt:     new Date().toISOString(),
      hasAnyLive,
      tdKeyPresent,
      tdRateLimited,
      sources: {
        indices:     pick(indices,     ['stooq']),
        commodities: pick(commodities, ['twelvedata', 'stooq']),
        fx:          pick(fx,          ['twelvedata', 'frankfurter']),
        stocks:      pick(topMovers,   ['stooq']),
      },
    },
  }

  return NextResponse.json(payload, {
    headers: {
      // Cache at the edge for 5 min (keeps Twelve Data well under the 800/day
      // free-tier budget: FX 4 + commodities 3 = 7 credits per refresh).
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=120',
      // Public market data, no secrets (key stays server-side) — allow the
      // standalone live dashboard (markets-dashboard.html) to read it.
      'Access-Control-Allow-Origin': '*',
    },
  })
}
