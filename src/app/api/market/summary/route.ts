/**
 * /api/market/summary
 *
 * Data sources — all free, no API key, not blocked from Vercel Lambda:
 *   • Stooq  — stocks, indices, commodities (same principle as Frankfurter for FX)
 *   • Frankfurter — AUD FX rates from ECB
 *
 * Twelve Data is used as a bonus top-up if the env key is present, but the
 * page will show real data even without it.
 */

import { NextResponse } from 'next/server'
import {
  fetchStooqQuotes,
  STOOQ_INDICES,
  STOOQ_COMMODITIES,
  STOOQ_ASX_STOCKS,
} from '@/lib/market/stooq'
import { fetchAUDRates } from '@/lib/market/frankfurter'

export async function GET() {
  // Fire all free sources in parallel — same pattern as fetchAUDRates() for FX
  const [indexQuotes, commodityQuotes, stockQuotes, fxRates] = await Promise.all([
    fetchStooqQuotes(STOOQ_INDICES).catch(() => new Map()),
    fetchStooqQuotes(STOOQ_COMMODITIES).catch(() => new Map()),
    fetchStooqQuotes(STOOQ_ASX_STOCKS).catch(() => new Map()),
    fetchAUDRates().catch(() => null),
  ])

  // ── Indices ────────────────────────────────────────────────────────────────
  const indices = STOOQ_INDICES.map(({ id }) => {
    const q = indexQuotes.get(id)
    return {
      name:      id,
      value:     q?.price     ?? null,
      change:    q?.change    ?? null,
      changeAbs: q?.changeAbs ?? null,
    }
  })

  // ── Commodities ────────────────────────────────────────────────────────────
  const commodities = STOOQ_COMMODITIES.map(({ id, unit }) => {
    const q = commodityQuotes.get(id)
    return {
      name:   id,
      unit,
      value:  q?.price  ?? null,
      change: q?.change ?? null,
    }
  })

  // ── FX — Frankfurter (same as before, this is what already worked) ─────────
  const rates = fxRates?.rates ?? {}
  const fx = [
    { pair: 'AUD/USD', value: rates.USD ?? null },
    { pair: 'AUD/CNY', value: rates.CNY ?? null },
    { pair: 'AUD/JPY', value: rates.JPY ?? null },
    { pair: 'AUD/EUR', value: rates.EUR ?? null },
  ].map(f => ({ ...f, change: null as number | null }))
  // Note: Frankfurter doesn't provide % change — that's fine, values show correctly

  // ── ASX Stocks ─────────────────────────────────────────────────────────────
  const topMovers = STOOQ_ASX_STOCKS.map(({ id, name }) => {
    const q = stockQuotes.get(id)
    return {
      ticker:    id,
      name,
      price:     q?.price     ?? null,
      change:    q?.change    ?? null,
      changeAbs: q?.changeAbs ?? null,
    }
  })

  // ASX 200 for hero
  const asxQ = indexQuotes.get('ASX 200')
  const asx  = asxQ
    ? { price: asxQ.price, change: asxQ.change, changeAbs: asxQ.changeAbs }
    : null

  const hasAnyLive =
    indices.some(i => i.value !== null) ||
    topMovers.some(m => m.price !== null) ||
    fx.some(f => f.value !== null)

  return NextResponse.json(
    {
      indices,
      commodities,
      fx,
      topMovers,
      asx,
      meta: {
        fetchedAt:  new Date().toISOString(),
        hasAnyLive,
        dataSource: 'stooq+frankfurter',
      },
    },
    { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60' } }
  )
}
