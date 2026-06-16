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

// ─── Symbol mapping (used by tickerToTD for feed-card price lookups) ──────────

const NON_PRICE = new Set(['RBA', 'ABS', 'APRA', 'TREASURY', 'GOVT', 'AFCA'])

export const TD_SYMBOLS: Record<string, { td: string; label: string; unit?: string }> = {
  // FX (free tier)
  AUDUSD: { td: 'AUD/USD', label: 'AUD/USD' },
  AUDCNY: { td: 'AUD/CNY', label: 'AUD/CNY' },
  AUDJPY: { td: 'AUD/JPY', label: 'AUD/JPY' },
  AUDEUR: { td: 'AUD/EUR', label: 'AUD/EUR' },
  // Commodities (free tier — priced as metal/oil vs USD)
  GOLD:   { td: 'XAU/USD', label: 'Gold',    unit: '/oz'  },
  OIL:    { td: 'WTI/USD', label: 'WTI Oil', unit: '/bbl' },
  SILVER: { td: 'XAG/USD', label: 'Silver',  unit: '/oz'  },
  // Top ASX stocks (NOTE: require a paid TD plan; free tier returns errors)
  CBA:    { td: 'CBA:ASX', label: 'Commonwealth Bank' },
  BHP:    { td: 'BHP:ASX', label: 'BHP Group'         },
  WDS:    { td: 'WDS:ASX', label: 'Woodside Energy'   },
  RIO:    { td: 'RIO:ASX', label: 'Rio Tinto'         },
  FMG:    { td: 'FMG:ASX', label: 'Fortescue'         },
  CSL:    { td: 'CSL:ASX', label: 'CSL Limited'       },
  NAB:    { td: 'NAB:ASX', label: 'Natl Australia Bank' },
  ANZ:    { td: 'ANZ:ASX', label: 'ANZ Group'         },
}

/** Map an ASX ticker string → Twelve Data symbol (for feed card price lookups). */
export function tickerToTD(ticker: string): string | null {
  const t = ticker.toUpperCase().trim()
  if (!t || NON_PRICE.has(t)) return null
  const entry = Object.values(TD_SYMBOLS).find(
    (e) => e.td.toUpperCase() === `${t}:ASX` || e.td.toUpperCase() === t
  )
  if (entry) return entry.td
  return `${t}:ASX` // default: assume ASX stock
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
  const unique = Array.from(new Set(symbols.filter(Boolean)))
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

/** Batch price lookup keyed by ASX ticker (for feed cards). */
export async function fetchQuotesByTicker(tickers: string[]): Promise<Map<string, TDQuote>> {
  if (tickers.length === 0) return new Map()

  const tickerToSym = new Map<string, string>() // ASX ticker → TD symbol
  for (const t of tickers) {
    const sym = tickerToTD(t)
    if (sym && !tickerToSym.has(t)) tickerToSym.set(t, sym)
  }
  if (tickerToSym.size === 0) return new Map()

  const cacheKey = Array.from(tickerToSym.values()).sort().join(',')
  const cached   = getCached<Map<string, TDQuote>>(cacheKey)
  if (cached) return cached

  const { quotes } = await fetchTwelveDataQuotes(Array.from(tickerToSym.values()))

  const out = new Map<string, TDQuote>()
  for (const [ticker, sym] of Array.from(tickerToSym.entries())) {
    const q = quotes.get(sym)
    if (q) out.set(ticker, { ...q, ticker })
  }

  setCached(cacheKey, out, TTL_QUOTE)
  return out
}
