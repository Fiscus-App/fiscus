import { NextResponse } from 'next/server'
import { fetchMarketSummary } from '@/lib/market/twelvedata'
import { fetchAUDRates }      from '@/lib/market/frankfurter'

export async function GET() {
  // Fetch Twelve Data summary and Frankfurter FX backup in parallel
  const [td, fxBackup] = await Promise.all([
    fetchMarketSummary(),
    fetchAUDRates(),
  ])

  // Frankfurter rates keyed by AUD pair
  const fbRates: Record<string, number> = {}
  if (fxBackup?.rates) {
    if (fxBackup.rates.USD) fbRates['AUD/USD'] = fxBackup.rates.USD
    if (fxBackup.rates.CNY) fbRates['AUD/CNY'] = fxBackup.rates.CNY
    if (fxBackup.rates.JPY) fbRates['AUD/JPY'] = fxBackup.rates.JPY
    if (fxBackup.rates.EUR) fbRates['AUD/EUR'] = fxBackup.rates.EUR
  }

  // ── Build response ──────────────────────────────────────────────────────────

  const indices = td.indices.map((i) => ({
    name:      i.name,
    value:     i.quote?.price     ?? null,
    change:    i.quote?.change    ?? null,
    changeAbs: i.quote?.changeAbs ?? null,
  }))

  const commodities = td.commodities.map((c) => ({
    name:   c.name,
    unit:   c.unit,
    value:  c.quote?.price  ?? null,
    change: c.quote?.change ?? null,
  }))

  const fx = td.fx.map((f) => {
    const tdVal     = f.quote?.price  ?? null
    const backupVal = fbRates[f.pair] ?? null
    return {
      pair:   f.pair,
      value:  tdVal ?? backupVal,
      change: f.quote?.change ?? null,
      // 'live' = Twelve Data real-time | 'ecb' = Frankfurter end-of-day | null = unavailable
      source: tdVal !== null ? 'live' : backupVal !== null ? 'ecb' : null,
    }
  })

  const topMovers = td.topMovers.map((m) => ({
    ticker: m.ticker,
    name:   m.name,
    price:  m.quote?.price  ?? null,
    change: m.quote?.change ?? null,
  }))

  const asx = td.asx
    ? { price: td.asx.price, change: td.asx.change, changeAbs: td.asx.changeAbs }
    : null

  // ── Metadata: tell the client what's actually live ──────────────────────────

  const hasLiveStocks      = topMovers.some((m) => m.price  !== null)
  const hasLiveCommodities = commodities.some((c) => c.value !== null)
  const hasLiveIndices     = indices.some((i) => i.value !== null)
  const hasLiveFX          = fx.some((f) => f.value !== null)
  const hasAnyLive         = hasLiveStocks || hasLiveCommodities || hasLiveIndices || hasLiveFX

  return NextResponse.json(
    {
      indices,
      commodities,
      fx,
      topMovers,
      asx,
      meta: {
        fetchedAt:          new Date().toISOString(),
        hasAnyLive,
        hasLiveStocks,
        hasLiveFX,
        hasLiveIndices,
        hasLiveCommodities,
        fxDate:             fxBackup?.date ?? null,  // e.g. "2026-06-10" for ECB label
      },
    },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } }
  )
}
