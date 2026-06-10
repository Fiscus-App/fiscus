/**
 * Financial Modeling Prep (FMP) market data client.
 * Free tier: 250 requests/day. Used for ASX stocks and global indices.
 * Base URL: https://financialmodelingprep.com/stable
 * Docs: https://site.financialmodelingprep.com/developer/docs
 */

const FMP_BASE = 'https://financialmodelingprep.com/stable'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FMPQuote {
  symbol:            string
  name:              string
  price:             number
  changesPercentage: number   // % change from previous close
  change:            number   // absolute change
  previousClose:     number
  open?:             number
  dayLow?:           number
  dayHigh?:          number
  volume?:           number
}

// ─── Cache ────────────────────────────────────────────────────────────────────

interface CacheEntry<T> { data: T; expires: number }
const cache = new Map<string, CacheEntry<unknown>>()

function getCached<T>(key: string): T | null {
  const e = cache.get(key) as CacheEntry<T> | undefined
  if (e && e.expires > Date.now()) return e.data
  cache.delete(key)
  return null
}
function setCached<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expires: Date.now() + ttlMs })
}

const TTL = 15 * 60 * 1000  // 15 minutes

// ─── Core fetch ───────────────────────────────────────────────────────────────

/**
 * Fetch quotes for an array of symbols.
 * Symbols: 'CBA.AX', 'BHP.AX' for ASX stocks; '^AXJO', '^GSPC' for indices.
 * Returns an empty array on any error — callers must handle missing data.
 */
export async function fmpQuotes(symbols: string[]): Promise<FMPQuote[]> {
  if (symbols.length === 0) return []

  const key = process.env.FMP_API_KEY
  if (!key) {
    console.error('[FMP] FMP_API_KEY not set')
    return []
  }

  const cacheKey = 'fmp:' + symbols.slice().sort().join(',')
  const cached   = getCached<FMPQuote[]>(cacheKey)
  if (cached) return cached

  try {
    const url = `${FMP_BASE}/quote?symbol=${symbols.join(',')}&apikey=${key}`
    const res = await fetch(url, {
      cache:  'no-store',
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      console.error('[FMP] HTTP', res.status, await res.text().catch(() => ''))
      return []
    }

    const data = await res.json()
    if (!Array.isArray(data)) {
      console.error('[FMP] unexpected response shape:', JSON.stringify(data).slice(0, 200))
      return []
    }

    const quotes = data as FMPQuote[]
    setCached(cacheKey, quotes, TTL)
    return quotes
  } catch (err) {
    console.error('[FMP] fetch error:', err)
    return []
  }
}

// ─── Convenience lookup ───────────────────────────────────────────────────────

/** Build a symbol → quote map from a quote array. */
export function quotesMap(quotes: FMPQuote[]): Map<string, FMPQuote> {
  const m = new Map<string, FMPQuote>()
  for (const q of quotes) m.set(q.symbol, q)
  return m
}
