/**
 * /api/market/summary — Node.js Lambda
 *
 * Returns FX rates (Frankfurter ECB) + commodity/index stubs.
 * Stocks and live indices come from /api/market/stocks (Edge Runtime)
 * because Yahoo Finance blocks Vercel Lambda (AWS) IPs.
 *
 * Sources:
 *   • Frankfurter — ECB reference FX (AUD/USD, AUD/CNY, AUD/JPY, AUD/EUR)
 */

import { NextResponse } from 'next/server'
import { fetchAUDRates } from '@/lib/market/frankfurter'

export async function GET() {
  const fxData = await fetchAUDRates().catch(() => null)

  const rates = fxData?.rates ?? {}

  const fx = [
    { pair: 'AUD/USD', value: rates.USD ?? null, change: null, source: rates.USD ? 'ecb' : null },
    { pair: 'AUD/CNY', value: rates.CNY ?? null, change: null, source: rates.CNY ? 'ecb' : null },
    { pair: 'AUD/JPY', value: rates.JPY ?? null, change: null, source: rates.JPY ? 'ecb' : null },
    { pair: 'AUD/EUR', value: rates.EUR ?? null, change: null, source: rates.EUR ? 'ecb' : null },
  ]

  // Commodity and index stubs — populated client-side from /api/market/live
  const commodities = [
    { name: 'Gold',    unit: '/oz',  value: null, change: null },
    { name: 'WTI Oil', unit: '/bbl', value: null, change: null },
    { name: 'Copper',  unit: '/lb',  value: null, change: null },
    { name: 'Silver',  unit: '/oz',  value: null, change: null },
  ]

  const indices = [
    { name: 'ASX 200',  value: null, change: null, changeAbs: null },
    { name: 'S&P 500',  value: null, change: null, changeAbs: null },
    { name: 'Nikkei',   value: null, change: null, changeAbs: null },
    { name: 'FTSE 100', value: null, change: null, changeAbs: null },
  ]

  return NextResponse.json(
    {
      fx,
      commodities,
      indices,
      topMovers: [],
      asx: null,
      meta: {
        fetchedAt:  new Date().toISOString(),
        hasLiveFX:  fx.some(f => f.value !== null),
        dataSource: 'frankfurter',
        note:       'Stocks/indices via /api/market/stocks (Edge). Commodities/FX via /api/market/live (Edge).',
      },
    },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300' } }
  )
}
