/**
 * Stooq — free financial data, no API key, not blocked from Vercel Lambda.
 * Same principle as Frankfurter (the FX source): totally open, CSV response.
 * https://stooq.com/q/l/?s={symbol}&f=sd2t2ohlcv&h&e=csv
 *
 * CSV columns: Symbol, Date, Time, Open, High, Low, Close, Volume
 * Change % is calculated as (Close - Open) / Open * 100 (intraday)
 */

export interface StooqQuote {
  symbol:    string
  price:     number   // current / last close
  open:      number
  change:    number   // % change (intraday: open → close)
  changeAbs: number   // absolute change
}

const BASE = 'https://stooq.com/q/l/'
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/csv,text/plain,*/*',
}

async function fetchOne(symbol: string): Promise<StooqQuote | null> {
  try {
    const url = `${BASE}?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcv&h&e=csv`
    const res = await fetch(url, {
      headers: HEADERS,
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const text = await res.text()
    const lines = text.trim().split('\n')
    if (lines.length < 2) return null

    const parts = lines[1].split(',')
    // cols: Symbol(0), Date(1), Time(2), Open(3), High(4), Low(5), Close(6), Volume(7)
    const open  = parseFloat(parts[3])
    const close = parseFloat(parts[6])

    if (!close || close <= 0 || isNaN(close) || !open || open <= 0) return null

    const changeAbs = close - open
    const change    = (changeAbs / open) * 100

    return {
      symbol,
      price:     Math.round(close  * 10000) / 10000,
      open:      Math.round(open   * 10000) / 10000,
      change:    Math.round(change * 100)   / 100,
      changeAbs: Math.round(changeAbs * 10000) / 10000,
    }
  } catch {
    return null
  }
}

/**
 * Fetch multiple symbols in parallel.
 * Returns a map of { id → quote } where id is what you passed in (not the Stooq symbol).
 */
export async function fetchStooqQuotes(
  requests: { id: string; sym: string }[]
): Promise<Map<string, StooqQuote>> {
  const results = await Promise.all(
    requests.map(async ({ id, sym }) => {
      const q = await fetchOne(sym)
      return { id, q }
    })
  )
  const out = new Map<string, StooqQuote>()
  for (const { id, q } of results) {
    if (q) out.set(id, q)
  }
  return out
}

// ─── Symbol catalogue ─────────────────────────────────────────────────────────

export const STOOQ_INDICES = [
  { id: 'ASX 200',   sym: '^axjo'  },
  { id: 'S&P 500',   sym: '^spx'   },
  { id: 'Nikkei',    sym: '^n225'  },
  { id: 'FTSE 100',  sym: '^ftse'  },
  { id: 'Hang Seng', sym: '^hsi'   },
  { id: 'DAX',       sym: '^gdaxi' },
]

export const STOOQ_COMMODITIES = [
  { id: 'Gold',         sym: 'xauusd', unit: '/oz'     },
  { id: 'Silver',       sym: 'xagusd', unit: '/oz'     },
  { id: 'WTI Crude',    sym: 'cl.f',   unit: '/bbl'    },
  { id: 'Natural Gas',  sym: 'ng.f',   unit: '/MMBtu'  },
  { id: 'Copper',       sym: 'hg.f',   unit: '/lb'     },
]

export const STOOQ_ASX_STOCKS = [
  { id: 'CBA', sym: 'cba.au', name: 'Commonwealth Bank'   },
  { id: 'BHP', sym: 'bhp.au', name: 'BHP Group'           },
  { id: 'CSL', sym: 'csl.au', name: 'CSL Limited'         },
  { id: 'NAB', sym: 'nab.au', name: 'National Australia'  },
  { id: 'WBC', sym: 'wbc.au', name: 'Westpac Banking'     },
  { id: 'WDS', sym: 'wds.au', name: 'Woodside Energy'     },
  { id: 'RIO', sym: 'rio.au', name: 'Rio Tinto'           },
  { id: 'ANZ', sym: 'anz.au', name: 'ANZ Group'           },
  { id: 'FMG', sym: 'fmg.au', name: 'Fortescue'           },
  { id: 'MQG', sym: 'mqg.au', name: 'Macquarie Group'     },
]

// ─── Ticker-keyed ASX quotes (free, no API key, no credit limit) ─────────────
// Replaces Twelve Data for ASX equities. The TD free tier can't serve
// "<TICKER>:ASX" symbols (they error) but still bills a credit per symbol, so
// using TD for the feed/quotes/asset surfaces silently drains the daily budget.
// Maps "CBA" → "cba.au". Small in-memory cache de-dupes repeat lookups.

interface CacheEntry { q: StooqQuote; expires: number }
const tickerCache = new Map<string, CacheEntry>()
const TICKER_TTL = 2 * 60 * 1000 // 2 min

export async function fetchStooqQuotesByTicker(tickers: string[]): Promise<Map<string, StooqQuote>> {
  const want = Array.from(new Set(tickers.map(t => t.toUpperCase().trim()).filter(Boolean)))
  const out  = new Map<string, StooqQuote>()
  if (want.length === 0) return out

  const now = Date.now()
  const missing: string[] = []
  for (const t of want) {
    const c = tickerCache.get(t)
    if (c && c.expires > now) out.set(t, c.q)
    else missing.push(t)
  }

  if (missing.length > 0) {
    try {
      const fresh = await fetchStooqQuotes(missing.map(t => ({ id: t, sym: `${t.toLowerCase()}.au` })))
      for (const [t, q] of Array.from(fresh.entries())) {
        out.set(t, q)
        tickerCache.set(t, { q, expires: now + TICKER_TTL })
      }
    } catch {
      // Stooq unreachable → return whatever was cached; callers degrade gracefully.
    }
  }

  return out
}
