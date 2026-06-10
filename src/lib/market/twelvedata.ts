/**
 * Twelve Data market data client.
 * Free tier: 800 API credits/day. 1 credit = 1 symbol per request.
 * Cache TTL is set conservatively to stay within free limits.
 */

const BASE_URL = 'https://api.twelvedata.com'

// ─── Cache (15-min TTL for summary, 5-min for individual tickers) ─────────────

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

const TTL_SUMMARY = 15 * 60 * 1000  // 15 min
const TTL_QUOTE   =  5 * 60 * 1000  //  5 min

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TDQuote {
  ticker:     string   // our display ticker (e.g. "CBA", "ASX200")
  tdSymbol:   string   // Twelve Data symbol (e.g. "CBA:ASX")
  price:      number
  change:     number   // % change
  changeAbs:  number
  prevClose:  number
  name?:      string
  isOpen?:    boolean
}

// ─── Symbol mapping ───────────────────────────────────────────────────────────

const NON_PRICE = new Set(['RBA', 'ABS', 'APRA', 'TREASURY', 'GOVT', 'AFCA'])

// Symbols we track with their Twelve Data symbol and display label
export const TD_SYMBOLS = {
  // Indices
  ASX200: { td: 'AXJO',    label: 'ASX 200'  },
  SP500:  { td: 'SPX',     label: 'S&P 500'  },
  NIKKEI: { td: 'NI225',   label: 'Nikkei'   },
  FTSE:   { td: 'UKX',     label: 'FTSE 100' },

  // Commodities
  GOLD:   { td: 'XAU/USD', label: 'Gold',    unit: '/oz'  },
  OIL:    { td: 'WTI/USD', label: 'WTI Oil', unit: '/bbl' },
  SILVER: { td: 'XAG/USD', label: 'Silver',  unit: '/oz'  },

  // FX
  AUDUSD: { td: 'AUD/USD', label: 'AUD/USD' },
  AUDCNY: { td: 'AUD/CNY', label: 'AUD/CNY' },
  AUDJPY: { td: 'AUD/JPY', label: 'AUD/JPY' },
  AUDEUR: { td: 'AUD/EUR', label: 'AUD/EUR' },

  // Top ASX stocks
  CBA:    { td: 'CBA:ASX', label: 'Commonwealth Bank' },
  BHP:    { td: 'BHP:ASX', label: 'BHP Group'         },
  WDS:    { td: 'WDS:ASX', label: 'Woodside Energy'   },
  RIO:    { td: 'RIO:ASX', label: 'Rio Tinto'         },
  FMG:    { td: 'FMG:ASX', label: 'Fortescue'         },
  CSL:    { td: 'CSL:ASX', label: 'CSL Limited'       },
  NAB:    { td: 'NAB:ASX', label: 'Natl Australia Bank'},
  ANZ:    { td: 'ANZ:ASX', label: 'ANZ Group'         },
}

// Map an ASX ticker string → Twelve Data symbol (for feed card price lookups)
export function tickerToTD(ticker: string): string | null {
  const t = ticker.toUpperCase().trim()
  if (!t || NON_PRICE.has(t)) return null
  // Check known overrides
  const entry = Object.values(TD_SYMBOLS).find(
    (e) => e.td.toUpperCase() === `${t}:ASX` || e.td.toUpperCase() === t
  )
  if (entry) return entry.td
  // Default: assume ASX stock
  return `${t}:ASX`
}

// ─── Core fetch ───────────────────────────────────────────────────────────────

interface TDRawQuote {
  symbol:         string
  name?:          string
  close?:         string
  previous_close?:string
  change?:        string
  percent_change?:string
  is_market_open?:boolean
  status?:        string
  code?:          number   // error code from TD
}

async function tdFetch(symbols: string[]): Promise<Record<string, TDRawQuote>> {
  const key = process.env.TWELVE_DATA_API_KEY
  if (!key) {
    console.error('[TwelveData] TWELVE_DATA_API_KEY not set')
    return {}
  }

  const url = `${BASE_URL}/quote?symbol=${encodeURIComponent(symbols.join(','))}&apikey=${key}`

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    console.error('[TwelveData] HTTP', res.status)
    return {}
  }

  const json = await res.json() as Record<string, TDRawQuote> | TDRawQuote

  // Single symbol returns the quote directly; multiple returns keyed object
  if (symbols.length === 1 && 'symbol' in json) {
    const q = json as TDRawQuote
    return q.status !== 'error' ? { [q.symbol]: q } : {}
  }

  return json as Record<string, TDRawQuote>
}

function parseQuote(raw: TDRawQuote, ticker: string): TDQuote | null {
  if (raw.status === 'error' || raw.code) return null
  const price    = parseFloat(raw.close         ?? '0')
  const prev     = parseFloat(raw.previous_close ?? '0')
  const changePct = parseFloat(raw.percent_change ?? '0')
  const changeAbs = parseFloat(raw.change        ?? '0')
  if (!price) return null
  return {
    ticker,
    tdSymbol:  raw.symbol,
    price,
    change:    changePct,
    changeAbs,
    prevClose: prev,
    name:      raw.name,
    isOpen:    raw.is_market_open,
  }
}

// ─── fetchMarketSummary ───────────────────────────────────────────────────────

export interface MarketSummaryData {
  indices:     { name: string; tdKey: string; quote: TDQuote | null }[]
  commodities: { name: string; unit: string; tdKey: string; quote: TDQuote | null }[]
  fx:          { pair: string; tdKey: string; quote: TDQuote | null }[]
  topMovers:   { ticker: string; name: string; quote: TDQuote | null }[]
  asx:         TDQuote | null
}

export async function fetchMarketSummary(): Promise<MarketSummaryData> {
  const cacheKey = 'td_summary'
  const cached   = getCached<MarketSummaryData>(cacheKey)
  if (cached) return cached

  // Gather all TD symbols in one batch request (credits = number of symbols)
  const allTD = [
    TD_SYMBOLS.ASX200.td, TD_SYMBOLS.SP500.td, TD_SYMBOLS.NIKKEI.td, TD_SYMBOLS.FTSE.td,
    TD_SYMBOLS.GOLD.td, TD_SYMBOLS.OIL.td, TD_SYMBOLS.SILVER.td,
    TD_SYMBOLS.AUDUSD.td, TD_SYMBOLS.AUDCNY.td, TD_SYMBOLS.AUDJPY.td, TD_SYMBOLS.AUDEUR.td,
    TD_SYMBOLS.CBA.td, TD_SYMBOLS.BHP.td, TD_SYMBOLS.WDS.td, TD_SYMBOLS.RIO.td,
    TD_SYMBOLS.FMG.td, TD_SYMBOLS.CSL.td, TD_SYMBOLS.NAB.td, TD_SYMBOLS.ANZ.td,
  ]

  const raw = await tdFetch(allTD)

  function q(key: keyof typeof TD_SYMBOLS): TDQuote | null {
    const { td, label } = TD_SYMBOLS[key]
    const r = raw[td]
    return r ? parseQuote(r, label) : null
  }

  const result: MarketSummaryData = {
    indices: [
      { name: 'ASX 200',  tdKey: 'ASX200', quote: q('ASX200') },
      { name: 'S&P 500',  tdKey: 'SP500',  quote: q('SP500')  },
      { name: 'Nikkei',   tdKey: 'NIKKEI', quote: q('NIKKEI') },
      { name: 'FTSE 100', tdKey: 'FTSE',   quote: q('FTSE')   },
    ],
    commodities: [
      { name: 'Gold',    unit: '/oz',  tdKey: 'GOLD',  quote: q('GOLD')  },
      { name: 'WTI Oil', unit: '/bbl', tdKey: 'OIL',   quote: q('OIL')   },
      { name: 'Silver',  unit: '/oz',  tdKey: 'SILVER',quote: q('SILVER')},
    ],
    fx: [
      { pair: 'AUD/USD', tdKey: 'AUDUSD', quote: q('AUDUSD') },
      { pair: 'AUD/CNY', tdKey: 'AUDCNY', quote: q('AUDCNY') },
      { pair: 'AUD/JPY', tdKey: 'AUDJPY', quote: q('AUDJPY') },
      { pair: 'AUD/EUR', tdKey: 'AUDEUR', quote: q('AUDEUR') },
    ],
    topMovers: [
      { ticker: 'CBA', name: 'Commonwealth Bank',   quote: q('CBA') },
      { ticker: 'BHP', name: 'BHP Group',           quote: q('BHP') },
      { ticker: 'WDS', name: 'Woodside Energy',     quote: q('WDS') },
      { ticker: 'RIO', name: 'Rio Tinto',           quote: q('RIO') },
      { ticker: 'FMG', name: 'Fortescue',           quote: q('FMG') },
      { ticker: 'CSL', name: 'CSL Limited',         quote: q('CSL') },
      { ticker: 'NAB', name: 'Natl Australia Bank', quote: q('NAB') },
      { ticker: 'ANZ', name: 'ANZ Group',           quote: q('ANZ') },
    ].sort((a, b) => Math.abs(b.quote?.change ?? 0) - Math.abs(a.quote?.change ?? 0)),
    asx: q('ASX200'),
  }

  setCached(cacheKey, result, TTL_SUMMARY)
  return result
}

// ─── fetchQuotes (for feed card prices) ──────────────────────────────────────

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

  const syms = Array.from(tickerToSym.values())
  const raw  = await tdFetch(syms)

  const out = new Map<string, TDQuote>()
  for (const [ticker, sym] of Array.from(tickerToSym.entries())) {
    const r = raw[sym]
    if (r) {
      const q = parseQuote(r, ticker)
      if (q) out.set(ticker, q)
    }
  }

  setCached(cacheKey, out, TTL_QUOTE)
  return out
}
