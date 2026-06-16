/**
 * /api/market/summary  —  Edge Runtime (Cloudflare IPs, not AWS Lambda)
 *
 * Sources:
 *  Stooq CSV     — indices + ASX stocks + commodities  (free, no key)
 *  Frankfurter   — AUD FX rates                        (free, no key, confirmed working)
 *  Twelve Data   — commodity fallback if Stooq fails   (API key in Vercel env)
 *
 * Edge Runtime avoids AWS IP blocks that affect Lambda-based routes.
 */

export const runtime = 'edge'

import { NextResponse } from 'next/server'

// ─── Stooq CSV fetcher ────────────────────────────────────────────────────────

const STOOQ_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/csv,text/plain,*/*',
  Referer: 'https://stooq.com/',
}

interface SQ { price: number; change: number; changeAbs: number }

async function fetchStooq(sym: string): Promise<SQ | null> {
  try {
    const url = `https://stooq.com/q/l/?s=${encodeURIComponent(sym)}&f=sd2t2ohlcv&h&e=csv`
    const res = await fetch(url, { headers: STOOQ_HEADERS, signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const text = await res.text()
    const lines = text.trim().split('\n')
    if (lines.length < 2) return null
    const parts = lines[1].split(',')
    // cols: Symbol(0) Date(1) Time(2) Open(3) High(4) Low(5) Close(6) Volume(7)
    const open  = parseFloat(parts[3])
    const close = parseFloat(parts[6])
    if (!close || close <= 0 || isNaN(close) || !open || open <= 0 || isNaN(open)) return null
    const changeAbs = close - open
    const change    = (changeAbs / open) * 100
    return {
      price:     Math.round(close     * 10000) / 10000,
      change:    Math.round(change    * 100)   / 100,
      changeAbs: Math.round(changeAbs * 10000) / 10000,
    }
  } catch {
    return null
  }
}

async function fetchAllStooq(requests: { id: string; sym: string }[]): Promise<Map<string, SQ>> {
  const settled = await Promise.allSettled(
    requests.map(async ({ id, sym }) => ({ id, q: await fetchStooq(sym) }))
  )
  const out = new Map<string, SQ>()
  for (const r of settled) {
    if (r.status === 'fulfilled' && r.value.q) out.set(r.value.id, r.value.q)
  }
  return out
}

// ─── Twelve Data — commodities only (avoids mixed-symbol batch bug) ───────────

async function fetchTDCommodities(): Promise<Map<string, SQ>> {
  const key = process.env.TWELVE_DATA_API_KEY
  if (!key) return new Map()
  try {
    // Only request symbols confirmed to work on free tier
    const syms = ['XAU/USD', 'XAG/USD', 'WTI/USD']
    const url   = `https://api.twelvedata.com/quote?symbol=${syms.join(',')}&apikey=${key}`
    const res   = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return new Map()
    const json  = await res.json() as Record<string, { close?: string; percent_change?: string; change?: string; status?: string; code?: number }>
    const out   = new Map<string, SQ>()
    for (const [sym, q] of Object.entries(json)) {
      if (!q || q.status === 'error' || q.code || !q.close) continue
      const price  = parseFloat(q.close)
      const change = parseFloat(q.percent_change ?? '0')
      const changeAbs = parseFloat(q.change ?? '0')
      if (!isNaN(price)) out.set(sym, { price, change, changeAbs })
    }
    return out
  } catch {
    return new Map()
  }
}

// ─── Frankfurter — AUD FX rates ───────────────────────────────────────────────

async function fetchAUDRates(): Promise<{ USD?: number; CNY?: number; JPY?: number; EUR?: number } | null> {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=AUD&to=USD,CNY,JPY,EUR', {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json() as { rates: { USD?: number; CNY?: number; JPY?: number; EUR?: number } }
    return data.rates
  } catch {
    return null
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET() {
  const [idxMap, cmdMap, tdCmd, stkMap, fxRates] = await Promise.all([
    // Indices
    fetchAllStooq([
      { id: 'ASX 200',  sym: '^axjo' },
      { id: 'S&P 500',  sym: '^spx'  },
      { id: 'Nikkei',   sym: '^n225' },
      { id: 'FTSE 100', sym: '^ftse' },
    ]),
    // Commodities via Stooq (primary)
    fetchAllStooq([
      { id: 'XAU', sym: 'xauusd' },
      { id: 'XAG', sym: 'xagusd' },
      { id: 'WTI', sym: 'cl.f'   },
    ]),
    // Commodities via Twelve Data (fallback)
    fetchTDCommodities(),
    // ASX stocks
    fetchAllStooq([
      { id: 'CBA', sym: 'cba.au' },
      { id: 'BHP', sym: 'bhp.au' },
      { id: 'CSL', sym: 'csl.au' },
      { id: 'NAB', sym: 'nab.au' },
      { id: 'WBC', sym: 'wbc.au' },
      { id: 'WDS', sym: 'wds.au' },
      { id: 'RIO', sym: 'rio.au' },
      { id: 'ANZ', sym: 'anz.au' },
      { id: 'FMG', sym: 'fmg.au' },
      { id: 'MQG', sym: 'mqg.au' },
    ]),
    // AUD FX rates
    fetchAUDRates().catch(() => null),
  ])

  // Helper: Stooq first, TD fallback for commodities
  function getCmd(stooqId: string, tdSym: string): SQ | undefined {
    return cmdMap.get(stooqId) ?? tdCmd.get(tdSym)
  }

  // ── Indices ────────────────────────────────────────────────────────────────
  const indices = [
    { name: 'ASX 200',  id: 'ASX 200'  },
    { name: 'S&P 500',  id: 'S&P 500'  },
    { name: 'Nikkei',   id: 'Nikkei'   },
    { name: 'FTSE 100', id: 'FTSE 100' },
  ].map(({ name, id }) => {
    const q = idxMap.get(id)
    return { name, value: q?.price ?? null, change: q?.change ?? null, changeAbs: q?.changeAbs ?? null }
  })

  // ── Commodities ────────────────────────────────────────────────────────────
  const commodities = [
    { name: 'Gold',    stooq: 'XAU', td: 'XAU/USD', unit: '/oz'  },
    { name: 'Silver',  stooq: 'XAG', td: 'XAG/USD', unit: '/oz'  },
    { name: 'WTI Oil', stooq: 'WTI', td: 'WTI/USD', unit: '/bbl' },
  ].map(({ name, stooq, td, unit }) => {
    const q = getCmd(stooq, td)
    return { name, unit, value: q?.price ?? null, change: q?.change ?? null }
  })

  // ── FX ─────────────────────────────────────────────────────────────────────
  const fx = [
    { pair: 'AUD/USD', value: fxRates?.USD ?? null },
    { pair: 'AUD/CNY', value: fxRates?.CNY ?? null },
    { pair: 'AUD/JPY', value: fxRates?.JPY ?? null },
    { pair: 'AUD/EUR', value: fxRates?.EUR ?? null },
  ].map(f => ({ ...f, change: null as number | null }))

  // ── ASX Stocks ─────────────────────────────────────────────────────────────
  const STOCK_NAMES: Record<string, string> = {
    CBA: 'Commonwealth Bank', BHP: 'BHP Group',       CSL: 'CSL Limited',
    NAB: 'National Australia', WBC: 'Westpac Banking', WDS: 'Woodside Energy',
    RIO: 'Rio Tinto',          ANZ: 'ANZ Group',       FMG: 'Fortescue',
    MQG: 'Macquarie Group',
  }

  const topMovers = ['CBA','BHP','CSL','NAB','WBC','WDS','RIO','ANZ','FMG','MQG'].map(ticker => {
    const q = stkMap.get(ticker)
    return {
      ticker,
      name:      STOCK_NAMES[ticker],
      price:     q?.price     ?? null,
      change:    q?.change    ?? null,
      changeAbs: q?.changeAbs ?? null,
    }
  })

  // ── ASX 200 hero ───────────────────────────────────────────────────────────
  const asxQ = idxMap.get('ASX 200')
  const asx  = asxQ ? { price: asxQ.price, change: asxQ.change, changeAbs: asxQ.changeAbs } : null

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
        fetchedAt:    new Date().toISOString(),
        hasAnyLive,
        dataSource:   'stooq+frankfurter+twelvedata',
        stooqIndices: idxMap.size,
        stooqStocks:  stkMap.size,
        stooqCmds:    cmdMap.size,
        tdCmds:       tdCmd.size,
      },
    },
    { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=30' } }
  )
}
