/**
 * GET /api/market/summary  —  Edge Runtime
 *
 * Shows ONLY data we can display correctly and for free from Vercel:
 *
 *   AUD FX       Frankfurter (ECB)    — correct, unlimited, with daily % change
 *   Commodities  Twelve Data          — XAU/XAG/WTI vs USD (real spot)
 *   Crypto       Twelve Data          — BTC/ETH/SOL vs USD (free tier)
 *
 * Deliberately NOT shown: ASX-listed share prices and stock-index *levels* —
 * no free source serves those correctly from a datacenter (Stooq/Yahoo are
 * IP-blocked; Twelve Data's free tier excludes them; US ETF/ADR "proxies" show
 * different numbers in USD and were misleading). Those require paid ASX/index
 * market-data licensing — see docs/MARKETS_DATA.md.
 *
 * Twelve Data load = 6 symbols/refresh, cached 20 min → well inside the free
 * 8/min + 800/day limits. The API key is read server-side only.
 */

export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { fetchTwelveDataQuotes } from '@/lib/market/twelvedata'
import { fetchAUDFx } from '@/lib/market/frankfurter'
import type {
  MarketSummaryResponse,
  CommodityRow,
  FXRow,
  CryptoRow,
} from '@/lib/market/types'

const COMMODITIES = [
  { name: 'Gold',    unit: '/oz',  td: 'XAU/USD' },
  { name: 'Silver',  unit: '/oz',  td: 'XAG/USD' },
  { name: 'WTI Oil', unit: '/bbl', td: 'WTI/USD' },
] as const

const CRYPTO = [
  { symbol: 'BTC/USD', name: 'Bitcoin',  td: 'BTC/USD' },
  { symbol: 'ETH/USD', name: 'Ethereum', td: 'ETH/USD' },
  { symbol: 'SOL/USD', name: 'Solana',   td: 'SOL/USD' },
] as const

const FX_PAIRS = [
  { pair: 'AUD/USD', ff: 'USD' },
  { pair: 'AUD/CNY', ff: 'CNY' },
  { pair: 'AUD/JPY', ff: 'JPY' },
  { pair: 'AUD/EUR', ff: 'EUR' },
] as const

export async function GET() {
  const tdSymbols = [...COMMODITIES.map(c => c.td), ...CRYPTO.map(c => c.td)]

  const [td, fx] = await Promise.all([
    fetchTwelveDataQuotes(tdSymbols),
    fetchAUDFx().catch(() => ({} as Record<string, { rate: number; changePct: number | null }>)),
  ])

  const tdKeyPresent  = td.status !== 'no_key'
  const tdRateLimited = td.status === 'rate_limited'

  // ── Hero: AUD/USD (the headline Australian number) ─────────────────────────
  const aud = fx['USD']
  const asx = aud
    ? { price: aud.rate, change: aud.changePct ?? 0, changeAbs: aud.changePct != null ? (aud.rate * aud.changePct) / 100 : 0 }
    : null

  // ── Commodities ────────────────────────────────────────────────────────────
  const commodities: CommodityRow[] = COMMODITIES.map(c => {
    const q = td.quotes.get(c.td)
    return { name: c.name, unit: c.unit, value: q?.price ?? null, change: q?.change ?? null, source: q ? 'twelvedata' : 'none' }
  })

  // ── Crypto ─────────────────────────────────────────────────────────────────
  const crypto: CryptoRow[] = CRYPTO.map(c => {
    const q = td.quotes.get(c.td)
    return { symbol: c.symbol, name: c.name, price: q?.price ?? null, change: q?.change ?? null, source: q ? 'twelvedata' : 'none' }
  })

  // ── FX (Frankfurter, with computed daily % change) ─────────────────────────
  const fxRows: FXRow[] = FX_PAIRS.map(f => {
    const q = fx[f.ff]
    return { pair: f.pair, value: q?.rate ?? null, change: q?.changePct ?? null, source: q ? 'frankfurter' : 'none' }
  })

  const hasAnyLive =
    asx !== null ||
    commodities.some(r => r.value !== null) ||
    crypto.some(r => r.price !== null) ||
    fxRows.some(r => r.value !== null)

  const payload: MarketSummaryResponse = {
    asx,
    indices: [],      // intentionally empty — index levels need licensed data
    commodities,
    fx: fxRows,
    topMovers: [],    // intentionally empty — ASX share prices need licensed data
    crypto,
    meta: {
      fetchedAt:     new Date().toISOString(),
      hasAnyLive,
      tdKeyPresent,
      tdRateLimited,
      sources: {
        indices:     'none',
        commodities: commodities.some(r => r.source === 'twelvedata') ? 'twelvedata'  : 'none',
        fx:          fxRows.some(r => r.source === 'frankfurter')      ? 'frankfurter' : 'none',
        stocks:      'none',
        crypto:      crypto.some(r => r.source === 'twelvedata')       ? 'twelvedata'  : 'none',
      },
    },
  }

  // Cache GOOD responses for 20 min (served stale while revalidating); cache a
  // rate-limited/empty response only briefly so the page retries soon.
  const dataOk = hasAnyLive && !tdRateLimited
  return NextResponse.json(payload, {
    headers: {
      'Cache-Control': dataOk
        ? 'public, s-maxage=1200, stale-while-revalidate=86400'
        : 'public, s-maxage=15',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
