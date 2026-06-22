/**
 * Asset search — ranked, case-insensitive, partial- and alias-aware matching
 * over the full Fiscus asset universe (src/lib/market/universe.ts).
 *
 * Pure + dependency-free so it can run on the server (API route) and be unit
 * tested directly. Ranking, highest first:
 *   exact ticker                100
 *   alias exact (common name)    96
 *   ticker prefix                84
 *   name prefix                  74
 *   word-in-name prefix          64
 *   name contains                44
 *   sector contains              18
 * Ties broken by asset type, then ticker length, then alphabetically.
 */

import { ASSET_UNIVERSE, ASSET_ALIASES, type UniverseAsset, type AssetType } from './universe'

export type { UniverseAsset, AssetType }

// Higher = surfaced first on equal text score (mega-asset classes first).
const TYPE_RANK: Record<AssetType, number> = {
  STOCK: 6, ETF: 5, CRYPTO: 5, INDEX: 4, COMMODITY: 4, FX: 3,
}

const alnum = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

function wordPrefix(name: string, q: string): boolean {
  // true if any whitespace/("/.-) separated word in `name` starts with `q`
  return name.split(/[\s.,()/-]+/).some(w => w.startsWith(q))
}

export function searchAssets(query: string, limit = 12): UniverseAsset[] {
  const q = (query ?? '').trim().toLowerCase()
  if (!q) return []
  const qAlnum = alnum(q)
  if (!qAlnum) return []

  // Common-name alias → ticker (exact phrase or alnum form).
  const aliasTicker = (ASSET_ALIASES[q] ?? ASSET_ALIASES[qAlnum] ?? '').toUpperCase()

  const scored: { a: UniverseAsset; score: number }[] = []

  for (const a of ASSET_UNIVERSE) {
    const tick = a.ticker.toLowerCase()
    const tickAlnum = alnum(a.ticker)
    const name = a.name.toLowerCase()

    let score = 0
    if (tick === q || tickAlnum === qAlnum) score = 100
    else if (aliasTicker && a.ticker.toUpperCase() === aliasTicker) score = 96
    else if (tick.startsWith(q) || tickAlnum.startsWith(qAlnum)) score = 84
    else if (name.startsWith(q)) score = 74
    else if (wordPrefix(name, q)) score = 64
    else if (name.includes(q)) score = 44
    else if (q.length >= 3 && a.sector.toLowerCase().includes(q)) score = 18

    if (score === 0) continue

    // Tie-breakers
    score += TYPE_RANK[a.type] ?? 0
    score -= Math.min(a.ticker.length, 6) * 0.4

    scored.push({ a, score })
  }

  scored.sort((x, y) =>
    y.score - x.score ||
    x.a.ticker.length - y.a.ticker.length ||
    x.a.ticker.localeCompare(y.a.ticker)
  )

  return scored.slice(0, limit).map(s => s.a)
}

/** Curated "browse" categories for the empty search state — links only, no
 *  fabricated prices. Tickers reference real assets in the universe. */
export interface BrowseCategory {
  id: string
  label: string
  icon: string
  tickers: string[]
}

export const BROWSE_CATEGORIES: BrowseCategory[] = [
  { id: 'au-majors', label: 'ASX Majors',     icon: '🇦🇺', tickers: ['CBA', 'BHP', 'CSL', 'NAB', 'WBC', 'MQG', 'WDS', 'WES', 'WOW', 'TLS'] },
  { id: 'us-megacap', label: 'US Mega-Caps',  icon: '🇺🇸', tickers: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'AVGO', 'JPM', 'LLY'] },
  { id: 'etfs',       label: 'Popular ETFs',  icon: '📊', tickers: ['SPY', 'VOO', 'QQQ', 'IVV', 'VAS', 'VGS', 'NDQ', 'GLD'] },
  { id: 'crypto',     label: 'Crypto',        icon: '₿',  tickers: ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE'] },
  { id: 'commodities',label: 'Commodities',   icon: '🛢️', tickers: ['GOLD', 'SILVER', 'OIL', 'BRENT', 'NATGAS', 'COPPER'] },
  { id: 'fx',         label: 'Forex',         icon: '💱', tickers: ['AUDUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'NZDUSD'] },
  { id: 'indices',    label: 'Indices',       icon: '📈', tickers: ['SPX', 'NDX', 'DJI', 'XJO', 'FTSE', 'N225'] },
]
