/**
 * Twelve Data market-data client.
 *
 * Free "Basic" tier: 8 API credits / minute, 800 / day. 1 credit = 1 symbol
 * in a /quote request. The free tier serves FOREX, CRYPTO and US EQUITIES
 * (plus metal/oil pairs like XAU/USD, WTI/USD). It does NOT serve indices or
 * internationally-listed equities (e.g. CBA:ASX) — those require the paid Grow
 * plan or higher and will come back as per-symbol errors. Callers must handle
 * that gracefully and fall back to another source (see /api/market/summary).
 *
 * All Twelve Data access in the app goes through fetchTwelveDataQuotes() so
 * there is exactly one fetch + normalize + rate-limit-detection path.
 */

const BASE_URL = 'https://api.twelvedata.com'

// ─── In-memory cache (best-effort; per server instance) ──────────────────────

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

const TTL_QUOTE = 5 * 60 * 1000  // 5 min

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TDQuote {
  ticker:     string   // our display ticker / label (e.g. "AUD/USD", "CBA")
  tdSymbol:   string   // Twelve Data symbol actually queried (e.g. "CBA:ASX")
  price:      number
  change:     number   // % change
  changeAbs:  number
  prevClose:  number
  name?:      string
  isOpen?:    boolean
}

/** Outcome of a Twelve Data batch fetch — lets callers distinguish failure modes. */
export type TDFetchStatus =
  | 'ok'            // request succeeded (some/all symbols may still be missing)
  | 'no_key'        // TWELVE_DATA_API_KEY not configured
  | 'rate_limited'  // hit the per-minute / daily credit limit (HTTP or body code 429)
  | 'http_error'    // non-2xx, non-429 HTTP response
  | 'error'         // network failure / invalid JSON / API error body

export interface TDBatchResult {
  status:   TDFetchStatus
  quotes:   Map<string, TDQuote>   // keyed by the requested symbol
  message?: string
}

interface TDRawQuote {
  symbol?:         string
  name?:           string
  close?:          string
  previous_close?: string
  change?:         string
  percent_change?: string
  is_market_open?: boolean
  status?:         string
  code?:           number          // error code from TD (e.g. 429, 404)
  message?:        string
}

// ─── Free-tier guard ─────────────────────────────────────────────────────────
// The Twelve Data free plan CANNOT serve ASX-listed equities ("<X>:ASX") or
// indices — those requests return per-symbol errors but STILL consume an API
// credit each, silently draining the 800/day budget and rate-limiting the
// whole app. We skip them here so credits are only ever spent on symbols that
// work on the free tier (forex, crypto, US equities, metal/oil pairs). ASX
// equities + indices are sourced from Stooq instead (src/lib/market/stooq.ts).
// If you upgrade to Grow+ (which unlocks indices + intl equities), delete this.

const TD_FREE_BLOCKED_INDEX = new Set([
  'AXJO', 'SPX', 'GSPC', 'NI225', 'UKX', 'NDX', 'IXIC', 'DJI', 'DAX', 'HSI', 'FTSE',
])

function isFreeTierBlocked(symbol: string): boolean {
  const s = symbol.toUpperCase()
  return /:ASX$/.test(s) || TD_FREE_BLOCKED_INDEX.has(s)
}

// ─── Normalization ───────────────────────────────────────────────────────────

const num = (v: string | undefined): number => {
  const n = parseFloat(v ?? '')
  return Number.isFinite(n) ? n : NaN
}

/** Parse a single raw TD quote into our normalized shape, or null if unusable. */
function parseQuote(raw: TDRawQuote, ticker: string): TDQuote | null {
  if (!raw || raw.status === 'error' || raw.code) return null
  const price = num(raw.close)
  if (!Number.isFinite(price) || price <= 0) return null

  const prev      = num(raw.previous_close)
  let   changePct = num(raw.percent_change)
  let   changeAbs = num(raw.change)

  // Derive change from previous close if TD didn't supply it.
  if (!Number.isFinite(changeAbs) && Number.isFinite(prev)) changeAbs = price - prev
  if (!Number.isFinite(changePct) && Number.isFinite(prev) && prev !== 0) {
    changePct = ((price - prev) / prev) * 100
  }

  return {
    ticker,
    tdSymbol:  raw.symbol ?? ticker,
    price,
    change:    Number.isFinite(changePct) ? changePct : 0,
    changeAbs: Number.isFinite(changeAbs) ? changeAbs : 0,
    prevClose: Number.isFinite(prev)      ? prev      : 0,
    name:      raw.name,
    isOpen:    raw.is_market_open,
  }
}

function isRateLimit(code: number | undefined): boolean {
  return code === 429
}

// ─── Core fetch (the ONLY Twelve Data network path) ──────────────────────────

/**
 * Fetch a batch of Twelve Data /quote symbols and return normalized quotes plus
 * an explicit status so the caller can fall back instead of silently failing.
 *
 * Handles: missing key, network errors, HTTP 429, top-level error body,
 * per-symbol error/429, and both the single-symbol (bare object) and
 * multi-symbol (keyed object) response shapes.
 */
export async function fetchTwelveDataQuotes(symbols: string[]): Promise<TDBatchResult> {
  const empty = (): Map<string, TDQuote> => new Map()
  // Drop symbols the free tier can't serve — they'd error AND burn credits.
  const unique = Array.from(new Set(symbols.filter(Boolean))).filter(s => !isFreeTierBlocked(s))
  if (unique.length === 0) return { status: 'ok', quotes: empty() }

  const key = process.env.TWELVE_DATA_API_KEY
  if (!key) return { status: 'no_key', quotes: empty(), message: 'TWELVE_DATA_API_KEY not set' }

  const url = `${BASE_URL}/quote?symbol=${encodeURIComponent(unique.join(','))}&apikey=${key}`

  let res: Response
  try {
    res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(10000) })
  } catch (err) {
    return { status: 'error', quotes: empty(), message: `fetch failed: ${String(err)}` }
  }

  if (res.status === 429) return { status: 'rate_limited', quotes: empty(), message: 'HTTP 429' }
  if (!res.ok)            return { status: 'http_error',   quotes: empty(), message: `HTTP ${res.status}` }

  let json: unknown
  try {
    json = await res.json()
  } catch {
    return { status: 'error', quotes: empty(), message: 'invalid JSON' }
  }

  // Top-level API error body, e.g. { code: 429, status: 'error', message: '...' }
  if (json && typeof json === 'object' && (json as TDRawQuote).status === 'error') {
    const body = json as TDRawQuote
    return {
      status:  isRateLimit(body.code) ? 'rate_limited' : 'error',
      quotes:  empty(),
      message: body.message ?? `code ${body.code}`,
    }
  }

  // Build [requestedSymbol, rawQuote] pairs for single- and multi-symbol shapes.
  const isSingle = unique.length === 1 && json && typeof json === 'object' && 'symbol' in (json as object)
  const pairs: [string, TDRawQuote][] = isSingle
    ? [[unique[0], json as TDRawQuote]]
    : Object.entries((json ?? {}) as Record<string, TDRawQuote>)

  const quotes = empty()
  let sawRateLimit = false

  for (const [reqSym, raw] of pairs) {
    if (!raw || typeof raw !== 'object') continue
    if (isRateLimit(raw.code)) { sawRateLimit = true; continue }
    const q = parseQuote(raw, reqSym)
    if (q) quotes.set(reqSym, q)
  }

  if (quotes.size === 0 && sawRateLimit) {
    return { status: 'rate_limited', quotes, message: 'per-symbol 429' }
  }
  return { status: 'ok', quotes }
}

// ─── Public helpers (asset page + feed) ──────────────────────────────────────

/** Single quote for the asset page. Any valid TD symbol. */
export async function fetchSingleQuote(tdSymbol: string, displayTicker: string): Promise<TDQuote | null> {
  const cacheKey = `single_${tdSymbol}`
  const cached   = getCached<TDQuote>(cacheKey)
  if (cached) return cached

  const { quotes } = await fetchTwelveDataQuotes([tdSymbol])
  const base = quotes.get(tdSymbol)
  if (!base) return null

  const q: TDQuote = { ...base, ticker: displayTicker }
  setCached(cacheKey, q, TTL_QUOTE)
  return q
}

/** 1-year weekly closes for charting. Returns [] on any failure. */
export async function fetchTimeSeries(tdSymbol: string): Promise<number[]> {
  if (isFreeTierBlocked(tdSymbol)) return []  // don't spend credits on unsupported symbols
  const cacheKey = `ts_${tdSymbol}`
  const cached   = getCached<number[]>(cacheKey)
  if (cached) return cached

  const key = process.env.TWELVE_DATA_API_KEY
  if (!key) return []

  try {
    const url = `${BASE_URL}/time_series?symbol=${encodeURIComponent(tdSymbol)}&interval=1week&outputsize=52&apikey=${key}`
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(10000) })
    if (!res.ok) return []

    const json = await res.json() as {
      status?: string
      values?: { datetime: string; close: string }[]
    }
    if (json.status === 'error' || !json.values?.length) return []

    const closes = json.values
      .slice()
      .reverse() // TD returns newest-first
      .map(v => parseFloat(v.close))
      .filter(n => Number.isFinite(n))

    setCached(cacheKey, closes, 30 * 60 * 1000)
    return closes
  } catch {
    return []
  }
}

// NOTE: ASX-ticker price lookups for the feed / quotes / asset surfaces now use
// Stooq (fetchStooqQuotesByTicker in stooq.ts) — the TD free tier can't serve
// ":ASX" symbols and billing a credit for each would drain the daily budget.
