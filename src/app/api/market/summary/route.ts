/**
 * /api/market/summary — Node.js Lambda
 *
 * Returns indices, FX, commodities, and top ASX movers via Yahoo Finance.
 * No API key required. Falls back to Frankfurter ECB for FX if Yahoo is down.
 */

import { NextResponse } from 'next/server'
import { fetchMarketSummary, MARKET_SYMBOLS } from '@/lib/market/yahoo'
import { fetchAUDRates } from '@/lib/market/frankfurter'

const INDEX_SYMBOLS: Record<string, string> = {
  '^AXJO': 'ASX 200',
  '^GSPC': 'S&P 500',
  '^N225': 'Nikkei',
  '^FTSE': 'FTSE 100',
}

const FX_SYMBOLS: Record<string, string> = {
  'AUDUSD=X': 'AUD/USD',
  'AUDCNY=X': 'AUD/CNY',
  'AUDJPY=X': 'AUD/JPY',
  'AUDEUR=X': 'AUD/EUR',
}

const COMMODITY_SYMBOLS: Record<string, { name: string; unit: string }> = {
  'GC=F': { name: 'Gold',    unit: '/oz'  },
  'CL=F': { name: 'WTI Oil', unit: '/bbl' },
  'HG=F': { name: 'Copper',  unit: '/lb'  },
  'SI=F': { name: 'Silver',  unit: '/oz'  },
}

const ASX_NAMES: Record<string, string> = {
  'CBA.AX': 'Commonwealth Bank',
  'BHP.AX': 'BHP Group',
  'WDS.AX': 'Woodside Energy',
  'RIO.AX': 'Rio Tinto',
  'FMG.AX': 'Fortescue',
  'CSL.AX': 'CSL Limited',
  'NAB.AX': 'Natl Australia Bank',
  'ANZ.AX': 'ANZ Group',
}

export async function GET() {
  const [quotes, fxBackup] = await Promise.all([
    fetchMarketSummary().catch(() => ({} as Record<string, import('@/lib/market/yahoo').Quote>)),
    fetchAUDRates().catch(() => null),
  ])

  // ── Indices ──────────────────────────────────────────────────────────────
  const indices = MARKET_SYMBOLS.indices.map((sym) => {
    const q = quotes[sym]
    return {
      name:      INDEX_SYMBOLS[sym] ?? sym,
      value:     q?.price     ?? null,
      change:    q?.change    ?? null,
      changeAbs: q?.changeAbs ?? null,
    }
  })

  // ── FX (Yahoo → Frankfurter ECB fallback) ────────────────────────────────
  const fbRates: Record<string, number> = {}
  if (fxBackup?.rates) {
    if (fxBackup.rates.USD) fbRates['AUD/USD'] = fxBackup.rates.USD
    if (fxBackup.rates.CNY) fbRates['AUD/CNY'] = fxBackup.rates.CNY
    if (fxBackup.rates.JPY) fbRates['AUD/JPY'] = fxBackup.rates.JPY
    if (fxBackup.rates.EUR) fbRates['AUD/EUR'] = fxBackup.rates.EUR
  }

  const fx = MARKET_SYMBOLS.fx.map((sym) => {
    const q     = quotes[sym]
    const label = FX_SYMBOLS[sym] ?? sym
    const live  = q?.price ?? null
    const ecb   = fbRates[label] ?? null
    return {
      pair:   label,
      value:  live ?? ecb,
      change: q?.change ?? null,
      source: live !== null ? 'live' : ecb !== null ? 'ecb' : null,
    }
  })

  // ── Commodities ──────────────────────────────────────────────────────────
  const commodities = MARKET_SYMBOLS.commodities.map((sym) => {
    const q   = quotes[sym]
    const def = COMMODITY_SYMBOLS[sym] ?? { name: sym, unit: '' }
    return {
      name:   def.name,
      unit:   def.unit,
      value:  q?.price  ?? null,
      change: q?.change ?? null,
    }
  })

  // ── ASX top movers ────────────────────────────────────────────────────────
  const topMovers = MARKET_SYMBOLS.topAsx.map((sym) => {
    const q      = quotes[sym]
    const ticker = sym.replace('.AX', '')
    return {
      ticker,
      name:      ASX_NAMES[sym] ?? ticker,
      price:     q?.price     ?? null,
      change:    q?.change    ?? null,
      changeAbs: q?.changeAbs ?? null,
    }
  }).sort((a, b) => Math.abs(b.change ?? 0) - Math.abs(a.change ?? 0))

  // ── ASX 200 ───────────────────────────────────────────────────────────────
  const axjoQ = quotes['^AXJO']
  const asx = axjoQ
    ? { price: axjoQ.price, change: axjoQ.change, changeAbs: axjoQ.changeAbs }
    : null

  const hasAnyLive = Object.keys(quotes).length > 0

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
        hasLiveStocks:      topMovers.some(m => m.price !== null),
        hasLiveFX:          fx.some(f => f.value !== null),
        hasLiveIndices:     indices.some(i => i.value !== null),
        hasLiveCommodities: commodities.some(c => c.value !== null),
        dataSource:         hasAnyLive ? 'yahoo' : 'none',
      },
    },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } }
  )
}
