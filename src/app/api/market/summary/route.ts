/**
 * /api/market/summary — Node.js Lambda
 * Uses Twelve Data — a proper REST API that works from Vercel Lambda.
 */

import { NextResponse } from 'next/server'
import { fetchMarketSummary } from '@/lib/market/twelvedata'
import { fetchAUDRates }      from '@/lib/market/frankfurter'

export async function GET() {
  const [td, fxBackup] = await Promise.all([
    fetchMarketSummary(),
    fetchAUDRates().catch(() => null),
  ])

  // FX: Twelve Data primary, Frankfurter ECB backup
  const fbRates: Record<string, number> = {}
  if (fxBackup?.rates) {
    if (fxBackup.rates.USD) fbRates['AUD/USD'] = fxBackup.rates.USD
    if (fxBackup.rates.CNY) fbRates['AUD/CNY'] = fxBackup.rates.CNY
    if (fxBackup.rates.JPY) fbRates['AUD/JPY'] = fxBackup.rates.JPY
    if (fxBackup.rates.EUR) fbRates['AUD/EUR'] = fxBackup.rates.EUR
  }

  const fx = td.fx.map(f => {
    const live   = f.quote?.price  ?? null
    const backup = fbRates[f.pair] ?? null
    return {
      pair:   f.pair,
      value:  live ?? backup,
      change: f.quote?.change ?? null,
      source: live !== null ? 'live' : backup !== null ? 'ecb' : null,
    }
  })

  const commodities = td.commodities.map(c => ({
    name:   c.name,
    unit:   c.unit,
    value:  c.quote?.price  ?? null,
    change: c.quote?.change ?? null,
  }))

  const indices = td.indices.map(i => ({
    name:      i.name,
    value:     i.quote?.price     ?? null,
    change:    i.quote?.change    ?? null,
    changeAbs: i.quote?.changeAbs ?? null,
  }))

  const topMovers = td.topMovers.map(m => ({
    ticker:    m.ticker,
    name:      m.name,
    price:     m.quote?.price     ?? null,
    change:    m.quote?.change    ?? null,
    changeAbs: m.quote?.changeAbs ?? null,
  }))

  const asx = td.asx
    ? { price: td.asx.price, change: td.asx.change, changeAbs: td.asx.changeAbs }
    : null

  const hasAnyLive = topMovers.some(m => m.price !== null) || fx.some(f => f.value !== null)

  return NextResponse.json(
    { indices, commodities, fx, topMovers, asx, meta: {
      fetchedAt: new Date().toISOString(),
      hasAnyLive,
      dataSource: hasAnyLive ? 'twelvedata' : 'none',
    }},
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } }
  )
}
