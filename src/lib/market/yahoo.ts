/**
 * Yahoo Finance client — free, no API key required.
 * Uses in-memory server-side cache with 5-minute TTL.
 */

interface CacheEntry<T> {
  data: T
  expires: number
}

const cache = new Map<string, CacheEntry<unknown>>()
const TTL_MS = 5 * 60 * 1000 // 5 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  if (entry && entry.expires > Date.now()) return entry.data
  cache.delete(key)
  return null
}

function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, expires: Date.now() + TTL_MS })
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Quote {
  ticker: string
  symbol: string
  price: number
  change: number     // % change
  changeAbs: number
  prevClose: number
  volume?: number
  name?: string
  marketState?: string // REGULAR, PRE, POST, CLOSED
}

// ─── Symbol helpers ───────────────────────────────────────────────────────────

// Tickers that don't have a market price (institutions, govt bodies)
const NON_PRICE = new Set(['RBA', 'ABS', 'APRA', 'TREASURY', 'GOVT', 'AFCA'])

// Known commodity / index / FX overrides
const SYMBOL_OVERRIDES: Record<string, string> = {
  GOLD:   'GC=F',
  SILVER: 'SI=F',
  OIL:    'CL=F',
  WTI:    'CL=F',
  COPPER: 'HG=F',
  AUD:    'AUDUSD=X',
  ASX200: '^AXJO',
  SP500:  '^GSPC',
}

export function toYahooSymbol(ticker: string): string | null {
  const t = ticker.toUpperCase().trim()
  if (!t || NON_PRICE.has(t)) return null
  const override = SYMBOL_OVERRIDES[t]
  if (override) return override
  // Assume ASX-listed stock — append .AX
  return `${t}.AX`
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

/**
 * Fetch live quotes for a list of tickers.
 * Returns a Map keyed by the original ticker string.
 */
export async function fetchQuotes(tickers: string[]): Promise<Map<string, Quote>> {
  if (tickers.length === 0) return new Map()

  // Build symbol→ticker map, skip non-price tickers
  const symbolToTicker = new Map<string, string>()
  for (const ticker of tickers) {
    const symbol = toYahooSymbol(ticker)
    if (symbol && !symbolToTicker.has(symbol)) {
      symbolToTicker.set(symbol, ticker)
    }
  }

  if (symbolToTicker.size === 0) return new Map()

  const symbolsKey = [...symbolToTicker.keys()].sort().join(',')
  const cached = getCached<Map<string, Quote>>(symbolsKey)
  if (cached) return cached

  try {
    const symbols = [...symbolToTicker.keys()].join(',')
    const fields  = 'regularMarketPrice,regularMarketChangePercent,regularMarketChange,regularMarketPreviousClose,regularMarketVolume,shortName,marketState'
    const url     = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=${fields}`

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Fiscus/1.0)',
        Accept: 'application/json',
      },
      // Bypass Next.js fetch cache — we use our own TTL
      cache: 'no-store',
    })

    if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status}`)

    const json = await res.json()
    const results: Record<string, unknown>[] = json?.quoteResponse?.result ?? []

    const quotes = new Map<string, Quote>()

    for (const r of results) {
      const symbol = r.symbol as string
      const ticker = symbolToTicker.get(symbol) ?? symbol

      quotes.set(ticker, {
        ticker,
        symbol,
        price:      (r.regularMarketPrice      as number) ?? 0,
        change:     (r.regularMarketChangePercent as number) ?? 0,
        changeAbs:  (r.regularMarketChange       as number) ?? 0,
        prevClose:  (r.regularMarketPreviousClose as number) ?? 0,
        volume:      r.regularMarketVolume      as number | undefined,
        name:        r.shortName                as string | undefined,
        marketState: r.marketState              as string | undefined,
      })
    }

    setCached(symbolsKey, quotes)
    return quotes

  } catch (err) {
    console.error('[Yahoo Finance] fetchQuotes failed:', err)
    return new Map()
  }
}

// ─── Convenience: fetch a known set of market symbols ─────────────────────────

export const MARKET_SYMBOLS = {
  indices: ['^AXJO', '^GSPC', '^N225', '^FTSE'],
  commodities: ['GC=F', 'CL=F', 'HG=F', 'SI=F'],
  fx: ['AUDUSD=X', 'AUDCNY=X', 'AUDJPY=X', 'AUDEUR=X'],
  topAsx: ['CBA.AX', 'BHP.AX', 'WDS.AX', 'RIO.AX', 'FMG.AX', 'CSL.AX', 'NAB.AX', 'ANZ.AX'],
}

/**
 * Fetch all market overview data in one batched request.
 */
export async function fetchMarketSummary() {
  const allSymbols = [
    ...MARKET_SYMBOLS.indices,
    ...MARKET_SYMBOLS.commodities,
    ...MARKET_SYMBOLS.fx,
    ...MARKET_SYMBOLS.topAsx,
  ]

  const cacheKey = 'market_summary'
  const cached = getCached<Record<string, Quote>>(cacheKey)
  if (cached) return cached

  try {
    const fields = 'regularMarketPrice,regularMarketChangePercent,regularMarketChange,regularMarketPreviousClose,regularMarketVolume,shortName,marketState'
    const url    = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(allSymbols.join(','))}&fields=${fields}`

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Fiscus/1.0)',
        Accept: 'application/json',
      },
      cache: 'no-store',
    })

    if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status}`)

    const json = await res.json()
    const results: Record<string, unknown>[] = json?.quoteResponse?.result ?? []

    const out: Record<string, Quote> = {}
    for (const r of results) {
      const symbol = r.symbol as string
      out[symbol] = {
        ticker:     symbol,
        symbol,
        price:      (r.regularMarketPrice           as number) ?? 0,
        change:     (r.regularMarketChangePercent    as number) ?? 0,
        changeAbs:  (r.regularMarketChange           as number) ?? 0,
        prevClose:  (r.regularMarketPreviousClose    as number) ?? 0,
        volume:      r.regularMarketVolume           as number | undefined,
        name:        r.shortName                    as string | undefined,
        marketState: r.marketState                  as string | undefined,
      }
    }

    setCached(cacheKey, out)
    return out

  } catch (err) {
    console.error('[Yahoo Finance] fetchMarketSummary failed:', err)
    return {} as Record<string, Quote>
  }
}
