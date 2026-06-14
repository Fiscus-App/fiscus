/**
 * Financial Modeling Prep (FMP) market data client.
 * Free tier: 250 requests/day.
 *
 * Uses the v3 endpoint (path-based symbols) which is the stable production endpoint.
 * The newer /stable/ endpoint had inconsistent support for our symbols.
 *
 * Docs: https://site.financialmodelingprep.com/developer/docs
 */

const FMP_BASE_V3 = 'https://financialmodelingprep.com/api/v3'

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

const TTL = 15 * 60 * 1000

// ─── Core fetch ───────────────────────────────────────────────────────────────

/**
 * Fetch quotes for an array of symbols using the FMP v3 endpoint.
 * Symbols in PATH: /api/v3/quote/CBA.AX,BHP.AX,^AXJO
 */
export async function fmpQuotes(symbols: string[]): Promise<FMPQuote[]> {
  if (symbols.length === 0) return []

  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    console.error('[FMP] FMP_API_KEY not set')
    return []
  }

  const cacheKey = 'fmp:' + symbols.slice().sort().join(',')
  const cached   = getCached<FMPQuote[]>(cacheKey)
  if (cached) return cached

  // v3 puts symbols in the URL path, not a query param
  const symbolStr = symbols.join(',')
  const url = `${FMP_BASE_V3}/quote/${encodeURIComponent(symbolStr)}?apikey=${apiKey}`

  try {
    const res = await fetch(url, {
      cache:  'no-store',
      signal: AbortSignal.timeout(8000),
    })

    const text = await res.text()

    if (!res.ok) {
      console.error(`[FMP] HTTP ${res.status}:`, text.slice(0, 300))
      return []
    }

    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      console.error('[FMP] invalid JSON:', text.slice(0, 300))
      return []
    }

    if (!Array.isArray(data)) {
      console.error('[FMP] expected array, got:', JSON.stringify(data).slice(0, 300))
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function quotesMap(quotes: FMPQuote[]): Map<string, FMPQuote> {
  const m = new Map<string, FMPQuote>()
  for (const q of quotes) m.set(q.symbol, q)
  return m
}
