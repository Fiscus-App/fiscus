/**
 * Yahoo Finance client — free, no API key required.
 * Uses cookie+crumb auth (required by Yahoo Finance since 2024)
 * and in-memory server-side cache with 5-minute TTL.
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

// ─── Cache ────────────────────────────────────────────────────────────────────

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

// ─── Yahoo Finance cookie + crumb auth ───────────────────────────────────────

interface YahooAuth {
  crumb:   string
  cookie:  string
  expires: number
}

let authCache: YahooAuth | null = null

async function getAuth(): Promise<YahooAuth | null> {
  if (authCache && authCache.expires > Date.now()) return authCache

  try {
    // Step 1 — visit finance.yahoo.com to get session cookies
    const r1 = await fetch('https://finance.yahoo.com/', {
      headers: { 'User-Agent': UA },
      redirect: 'follow',
    })

    // Node 18+ has getSetCookie(); fall back to get() for older runtimes
    const raw: string[] =
      typeof (r1.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === 'function'
        ? (r1.headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
        : r1.headers.get('set-cookie')
          ? [r1.headers.get('set-cookie') as string]
          : []

    const cookie = raw.map((c) => c.split(';')[0]).join('; ')
    if (!cookie) return null

    // Step 2 — exchange cookies for a crumb
    const r2 = await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb', {
      headers: { 'User-Agent': UA, Cookie: cookie, Accept: 'text/plain' },
    })
    if (!r2.ok) return null

    const crumb = (await r2.text()).trim()
    if (!crumb || crumb.startsWith('<')) return null // HTML = blocked

    authCache = { crumb, cookie, expires: Date.now() + 23 * 3_600_000 } // 23 h
    return authCache
  } catch (e) {
    console.error('[Yahoo] getAuth failed:', e)
    return null
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Quote {
  ticker:      string
  symbol:      string
  price:       number
  change:      number     // % change
  changeAbs:   number
  prevClose:   number
  volume?:     number
  name?:       string
  marketState?: string
}

// ─── Symbol helpers ───────────────────────────────────────────────────────────

const NON_PRICE = new Set(['RBA', 'ABS', 'APRA', 'TREASURY', 'GOVT', 'AFCA'])

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
  return `${t}.AX`
}

// ─── Core fetch helper ────────────────────────────────────────────────────────

async function yahooFetch(url: string): Promise<unknown> {
  const auth = await getAuth()
  const finalUrl = auth ? `${url}&crumb=${encodeURIComponent(auth.crumb)}` : url

  const res = await fetch(finalUrl, {
    headers: {
      'User-Agent': UA,
      Accept: 'application/json',
      ...(auth ? { Cookie: auth.cookie } : {}),
    },
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`Yahoo Finance HTTP ${res.status} for ${finalUrl}`)
  return res.json()
}

// ─── fetchQuotes ──────────────────────────────────────────────────────────────

export async function fetchQuotes(tickers: string[]): Promise<Map<string, Quote>> {
  if (tickers.length === 0) return new Map()

  const symbolToTicker = new Map<string, string>()
  for (const ticker of tickers) {
    const symbol = toYahooSymbol(ticker)
    if (symbol && !symbolToTicker.has(symbol)) symbolToTicker.set(symbol, ticker)
  }
  if (symbolToTicker.size === 0) return new Map()

  const symbolsKey = Array.from(symbolToTicker.keys()).sort().join(',')
  const cached = getCached<Map<string, Quote>>(symbolsKey)
  if (cached) return cached

  try {
    const symbols = Array.from(symbolToTicker.keys()).join(',')
    const fields  = 'regularMarketPrice,regularMarketChangePercent,regularMarketChange,regularMarketPreviousClose,regularMarketVolume,shortName,marketState'
    const url     = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=${fields}`

    const json = await yahooFetch(url) as { quoteResponse?: { result?: Record<string, unknown>[] } }
    const results = json?.quoteResponse?.result ?? []

    const quotes = new Map<string, Quote>()
    for (const r of results) {
      const symbol = r.symbol as string
      const ticker = symbolToTicker.get(symbol) ?? symbol
      quotes.set(ticker, {
        ticker,
        symbol,
        price:      (r.regularMarketPrice           as number) ?? 0,
        change:     (r.regularMarketChangePercent    as number) ?? 0,
        changeAbs:  (r.regularMarketChange           as number) ?? 0,
        prevClose:  (r.regularMarketPreviousClose    as number) ?? 0,
        volume:      r.regularMarketVolume           as number | undefined,
        name:        r.shortName                    as string | undefined,
        marketState: r.marketState                  as string | undefined,
      })
    }

    setCached(symbolsKey, quotes)
    return quotes
  } catch (err) {
    console.error('[Yahoo Finance] fetchQuotes failed:', err)
    return new Map()
  }
}

// ─── fetchMarketSummary ───────────────────────────────────────────────────────

export const MARKET_SYMBOLS = {
  indices:    ['^AXJO', '^GSPC', '^N225', '^FTSE'],
  commodities:['GC=F',  'CL=F',  'HG=F',  'SI=F'],
  fx:         ['AUDUSD=X', 'AUDCNY=X', 'AUDJPY=X', 'AUDEUR=X'],
  topAsx:     ['CBA.AX', 'BHP.AX', 'WDS.AX', 'RIO.AX', 'FMG.AX', 'CSL.AX', 'NAB.AX', 'ANZ.AX'],
}

export async function fetchMarketSummary(): Promise<Record<string, Quote>> {
  const cacheKey = 'market_summary'
  const cached = getCached<Record<string, Quote>>(cacheKey)
  if (cached) return cached

  const allSymbols = [
    ...MARKET_SYMBOLS.indices,
    ...MARKET_SYMBOLS.commodities,
    ...MARKET_SYMBOLS.fx,
    ...MARKET_SYMBOLS.topAsx,
  ]

  try {
    const fields = 'regularMarketPrice,regularMarketChangePercent,regularMarketChange,regularMarketPreviousClose,regularMarketVolume,shortName,marketState'
    const url    = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(allSymbols.join(','))}&fields=${fields}`

    const json = await yahooFetch(url) as { quoteResponse?: { result?: Record<string, unknown>[] } }
    const results = json?.quoteResponse?.result ?? []

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
    return {}
  }
}
