/**
 * /api/market/stocks  — Edge Runtime
 *
 * Runs on Cloudflare's edge network (not AWS Lambda). Yahoo Finance blocks
 * Lambda IPs but allows Cloudflare IPs, so this route can fetch live quotes
 * that the regular Lambda summary route cannot.
 *
 * Strategy:
 *   1. Yahoo Finance v7 batch quote (fast, real-time)
 *   2. Stooq CSV fallback (ASX stocks + ASX 200 only, intraday change from open)
 */

export const runtime = 'edge'

// ── Symbols ───────────────────────────────────────────────────────────────────

const STOCK_SYMS  = ['CBA.AX', 'BHP.AX', 'WDS.AX', 'RIO.AX', 'FMG.AX', 'CSL.AX', 'NAB.AX', 'ANZ.AX']
const INDEX_SYMS  = ['^AXJO', '^GSPC', '^N225', '^FTSE']

const STOCK_NAMES: Record<string, string> = {
  'CBA.AX': 'Commonwealth Bank',   'BHP.AX': 'BHP Group',
  'WDS.AX': 'Woodside Energy',     'RIO.AX': 'Rio Tinto',
  'FMG.AX': 'Fortescue',           'CSL.AX': 'CSL Limited',
  'NAB.AX': 'Natl Australia Bank', 'ANZ.AX': 'ANZ Group',
}
const INDEX_NAMES: Record<string, string> = {
  '^AXJO': 'ASX 200', '^GSPC': 'S&P 500', '^N225': 'Nikkei', '^FTSE': 'FTSE 100',
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface StockResult {
  ticker:    string
  name:      string
  price:     number | null
  change:    number | null
  changeAbs: number | null
}
interface IndexResult {
  name:      string
  value:     number | null
  change:    number | null
  changeAbs: number | null
}
interface AsxResult { price: number; change: number; changeAbs: number }

// ── Yahoo Finance v7 batch ────────────────────────────────────────────────────

interface YahooQuote {
  symbol:                     string
  regularMarketPrice:         number
  regularMarketChange:        number
  regularMarketChangePercent: number
}

async function fromYahoo(): Promise<{
  stocks: StockResult[]
  indices: IndexResult[]
  asx: AsxResult | null
} | null> {
  const allSyms = [...STOCK_SYMS, ...INDEX_SYMS]
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${allSyms.join(',')}`

  const res = await fetch(url, {
    headers: {
      'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept':          'application/json, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer':         'https://finance.yahoo.com/',
    },
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) return null

  const data = await res.json() as { quoteResponse?: { result?: YahooQuote[] } }
  const results = data?.quoteResponse?.result ?? []
  if (results.length === 0) return null

  const bySymbol = new Map(results.map((r) => [r.symbol, r]))

  const stocks = STOCK_SYMS.map((sym): StockResult => {
    const q = bySymbol.get(sym)
    return {
      ticker:    sym.replace('.AX', ''),
      name:      STOCK_NAMES[sym],
      price:     q?.regularMarketPrice         ?? null,
      change:    q?.regularMarketChangePercent ?? null,
      changeAbs: q?.regularMarketChange        ?? null,
    }
  })

  const indices = INDEX_SYMS.map((sym): IndexResult => {
    const q = bySymbol.get(sym)
    return {
      name:      INDEX_NAMES[sym],
      value:     q?.regularMarketPrice         ?? null,
      change:    q?.regularMarketChangePercent ?? null,
      changeAbs: q?.regularMarketChange        ?? null,
    }
  })

  const axjoQ = bySymbol.get('^AXJO')
  const asx: AsxResult | null = axjoQ
    ? { price: axjoQ.regularMarketPrice, change: axjoQ.regularMarketChangePercent, changeAbs: axjoQ.regularMarketChange }
    : null

  return { stocks, indices, asx }
}

// ── Stooq CSV fallback ────────────────────────────────────────────────────────
// Provides ASX stocks and ASX 200 only.
// Intraday change = (close − open) / open — not from prev-close, but indicative.

async function fetchStooqRow(s: string): Promise<{ price: number; changePct: number } | null> {
  try {
    const res = await fetch(
      `https://stooq.com/q/l/?s=${s}&f=sd2t2ohlcv&h&e=csv`,
      { signal: AbortSignal.timeout(7000) }
    )
    if (!res.ok) return null
    const text = await res.text()
    const lines = text.trim().split('\n')
    if (lines.length < 2) return null
    const parts = lines[1].split(',')
    const open  = parseFloat(parts[3])
    const close = parseFloat(parts[6])
    if (!close || close <= 0 || isNaN(close)) return null
    const changePct = open && !isNaN(open) ? ((close - open) / open) * 100 : 0
    return { price: close, changePct }
  } catch {
    return null
  }
}

async function fromStooq(): Promise<{
  stocks: StockResult[]
  indices: IndexResult[]
  asx: AsxResult | null
} | null> {
  // Stooq ASX symbols: CBA.AX → cba.au
  const stooqSyms  = STOCK_SYMS.map((s) => s.replace('.AX', '').toLowerCase() + '.au')
  const [shareResults, xjoData] = await Promise.all([
    Promise.all(stooqSyms.map((s) => fetchStooqRow(s))),
    fetchStooqRow('^axjo'),
  ])

  const stocks = STOCK_SYMS.map((sym, i): StockResult => {
    const r = shareResults[i]
    return {
      ticker:    sym.replace('.AX', ''),
      name:      STOCK_NAMES[sym],
      price:     r?.price     ?? null,
      change:    r?.changePct ?? null,
      changeAbs: null,
    }
  })

  if (!stocks.some((s) => s.price !== null)) return null

  const asx: AsxResult | null = xjoData
    ? { price: xjoData.price, change: xjoData.changePct, changeAbs: 0 }
    : null

  const indices = INDEX_SYMS.map((sym): IndexResult => {
    if (sym === '^AXJO' && asx) {
      return { name: 'ASX 200', value: asx.price, change: asx.change, changeAbs: asx.changeAbs }
    }
    return { name: INDEX_NAMES[sym], value: null, change: null, changeAbs: null }
  })

  return { stocks, indices, asx }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET() {
  let result: Awaited<ReturnType<typeof fromYahoo>> = null
  let source = 'none'

  // 1. Yahoo Finance (Cloudflare Edge IPs — different from blocked Lambda IPs)
  try {
    result = await fromYahoo()
    if (result?.stocks.some((s) => s.price !== null)) {
      source = 'yahoo'
    } else {
      result = null
    }
  } catch {
    result = null
  }

  // 2. Stooq CSV fallback (ASX stocks + ASX 200 only)
  if (!result) {
    try {
      result = await fromStooq()
      if (result) source = 'stooq'
    } catch {
      result = null
    }
  }

  // Sort stocks by absolute change % for the top-movers view
  const topMovers = (result?.stocks ?? []).sort(
    (a, b) => Math.abs(b.change ?? 0) - Math.abs(a.change ?? 0)
  )

  return Response.json(
    {
      topMovers,
      indices:   result?.indices ?? INDEX_SYMS.map((s) => ({ name: INDEX_NAMES[s], value: null, change: null, changeAbs: null })),
      asx:       result?.asx     ?? null,
      source,
      fetchedAt: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } }
  )
}
