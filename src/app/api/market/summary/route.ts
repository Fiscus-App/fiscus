/**
 * /api/market/summary  — Lambda (Node.js)
 *
 * Returns FX rates + commodities (metals) only.
 * Stocks and indices are fetched separately by /api/market/stocks (Edge Runtime)
 * which uses Cloudflare IPs that Yahoo Finance does not block.
 *
 * Sources:
 *   • Twelve Data — real-time FX (AUD/USD, AUD/JPY) + gold (XAU/USD)
 *   • Frankfurter  — ECB reference FX backup (AUD/USD, AUD/CNY, AUD/JPY, AUD/EUR)
 */

import { NextResponse } from 'next/server'
import { fetchMarketSummary } from '@/lib/market/twelvedata'
import { fetchAUDRates }      from '@/lib/market/frankfurter'

const STOCK_NAMES: Record<string, string> = {
  CBA: 'Commonwealth Bank',    BHP: 'BHP Group',
  WDS: 'Woodside Energy',      RIO: 'Rio Tinto',
  FMG: 'Fortescue',            CSL: 'CSL Limited',
  NAB: 'Natl Australia Bank',  ANZ: 'ANZ Group',
}

export async function GET() {
  const [td, fxBackup] = await Promise.all([
    fetchMarketSummary(),
    fetchAUDRates(),
  ])

  // ── FX (Twelve Data → Frankfurter ECB backup) ─────────────────────────────

  const fbRates: Record<string, number> = {}
  if (fxBackup?.rates) {
    if (fxBackup.rates.USD) fbRates['AUD/USD'] = fxBackup.rates.USD
    if (fxBackup.rates.CNY) fbRates['AUD/CNY'] = fxBackup.rates.CNY
    if (fxBackup.rates.JPY) fbRates['AUD/JPY'] = fxBackup.rates.JPY
    if (fxBackup.rates.EUR) fbRates['AUD/EUR'] = fxBackup.rates.EUR
  }

  const fx = td.fx.map((f) => {
    const tdVal     = f.quote?.price  ?? null
    const backupVal = fbRates[f.pair] ?? null
    return {
      pair:   f.pair,
      value:  tdVal ?? backupVal,
      change: f.quote?.change ?? null,
      source: tdVal !== null ? 'live' : backupVal !== null ? 'ecb' : null,
    }
  })

  // ── Commodities (Twelve Data: XAU/USD gold, etc.) ─────────────────────────

  const commodities = td.commodities.map((c) => ({
    name:   c.name,
    unit:   c.unit,
    value:  c.quote?.price  ?? null,
    change: c.quote?.change ?? null,
  }))

  // ── Meta ──────────────────────────────────────────────────────────────────

  const hasLiveFX          = fx.some((f) => f.value !== null)
  const hasLiveCommodities = commodities.some((c) => c.value !== null)

  return NextResponse.json(
    {
      // Stocks and indices start null — populated client-side from /api/market/stocks
      indices: [
        { name: 'ASX 200',  value: null, change: null, changeAbs: null },
        { name: 'S&P 500',  value: null, change: null, changeAbs: null },
        { name: 'Nikkei',   value: null, change: null, changeAbs: null },
        { name: 'FTSE 100', value: null, change: null, changeAbs: null },
      ],
      commodities,
      fx,
      topMovers: Object.keys(STOCK_NAMES).map((ticker) => ({
        ticker, name: STOCK_NAMES[ticker], price: null, change: null,
      })),
      asx: null,
      meta: {
        fetchedAt:          new Date().toISOString(),
        hasAnyLive:         hasLiveFX || hasLiveCommodities,
        hasLiveStocks:      false,
        hasLiveFX,
        hasLiveIndices:     false,
        hasLiveCommodities,
        fxDate:             fxBackup?.date ?? null,
        dataSource:         'none',
      },
    },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } }
  )
}
