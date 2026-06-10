/**
 * ASX (Australian Securities Exchange) direct API.
 * No API key required. Used as fallback for ASX stocks when FMP fails.
 *
 * Endpoints used:
 *   Share:  GET https://www.asx.com.au/asx/1/share/{CODE}
 *   Index:  GET https://www.asx.com.au/asx/1/index/{CODE}/quote
 *
 * These are the same endpoints powering asx.com.au's own website.
 * Rate limit: generous for our usage (~8 stocks per 15 min cache hit).
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ASXQuote {
  ticker:    string
  price:     number
  change:    number   // absolute change
  changePct: number   // % change
  prevClose: number
}

interface ASXShareRaw {
  code:                  string
  last_price:            number
  change_price:          number
  change_in_percent:     string   // e.g. "1.110%"
  previous_close_price:  number
}

interface ASXIndexRaw {
  code:              string
  last_price?:       number
  change_price?:     number
  change_in_percent?:string
  prev_price?:       number
  // alternate field names used by the index endpoint:
  index_value?:      number
  percent_change?:   number
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parsePct(s: string | undefined): number {
  if (!s) return 0
  return parseFloat(s.replace('%', '')) || 0
}

const ASX_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept':     'application/json',
  'Referer':    'https://www.asx.com.au/',
}

// ─── Fetch single share ───────────────────────────────────────────────────────

async function fetchShare(ticker: string): Promise<ASXQuote | null> {
  const key = `asx:share:${ticker}`
  const cached = getCached<ASXQuote>(key)
  if (cached) return cached

  try {
    const res = await fetch(`https://www.asx.com.au/asx/1/share/${ticker.toUpperCase()}`, {
      headers: ASX_HEADERS,
      cache:   'no-store',
      signal:  AbortSignal.timeout(6000),
    })
    if (!res.ok) return null

    const raw = await res.json() as ASXShareRaw
    if (!raw?.last_price) return null

    const quote: ASXQuote = {
      ticker,
      price:     raw.last_price,
      change:    raw.change_price      ?? 0,
      changePct: parsePct(raw.change_in_percent),
      prevClose: raw.previous_close_price ?? raw.last_price,
    }
    setCached(key, quote, TTL)
    return quote
  } catch {
    return null
  }
}

// ─── Fetch XJO index ─────────────────────────────────────────────────────────

async function fetchXJO(): Promise<ASXQuote | null> {
  const key = 'asx:index:XJO'
  const cached = getCached<ASXQuote>(key)
  if (cached) return cached

  try {
    const res = await fetch('https://www.asx.com.au/asx/1/index/XJO/quote', {
      headers: ASX_HEADERS,
      cache:   'no-store',
      signal:  AbortSignal.timeout(6000),
    })
    if (!res.ok) return null

    const raw = await res.json() as ASXIndexRaw
    const price = raw.last_price ?? raw.index_value
    if (!price) return null

    const changePct = parsePct(raw.change_in_percent ?? raw.percent_change?.toString())
    const quote: ASXQuote = {
      ticker:   'XJO',
      price,
      change:   raw.change_price ?? 0,
      changePct,
      prevClose: raw.prev_price ?? price,
    }
    setCached(key, quote, TTL)
    return quote
  } catch {
    return null
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch multiple ASX stocks in parallel. Returns a map of ticker → quote.
 * Any stock that fails returns null and is omitted from the map.
 */
export async function fetchASXQuotes(tickers: string[]): Promise<Map<string, ASXQuote>> {
  const results = await Promise.all(tickers.map((t) => fetchShare(t)))
  const m = new Map<string, ASXQuote>()
  for (const q of results) {
    if (q) m.set(q.ticker, q)
  }
  return m
}

/**
 * Fetch the ASX 200 (XJO) index from ASX directly.
 */
export { fetchXJO }
