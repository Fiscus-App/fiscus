/**
 * Shared, normalized market-data types for the Markets surfaces.
 *
 * This module is PURE TYPES + PURE HELPERS only — no `fetch`, no `process.env`,
 * no Node/Edge runtime code — so it is safe to import from client components
 * (the Markets page) as well as from API routes.
 *
 * The response contract below is a backward-compatible *superset* of the old
 * /api/market/summary shape: every field the old TickerTape / page consumed is
 * still present (asx, indices, fx, commodities, topMovers, meta), and we only
 * ADD fields (per-row `source`, richer `meta`). Existing consumers keep working.
 */

/** Where a given quote actually came from. */
export type MarketSource = 'twelvedata' | 'stooq' | 'frankfurter' | 'none'

/** Provider-agnostic normalized quote. */
export interface NormalizedQuote {
  symbol:        string             // provider symbol actually queried
  price:         number
  changePct:     number | null      // % change (vs prev close; intraday for Stooq)
  changeAbs:     number | null      // absolute change in price terms
  prevClose:     number | null
  isMarketOpen:  boolean | null
  source:        MarketSource
}

// ─── Markets page response contract ──────────────────────────────────────────

export interface IndexRow {
  name:      string
  value:     number | null
  change:    number | null
  changeAbs: number | null
  source:    MarketSource
}

export interface CommodityRow {
  name:   string
  unit:   string
  value:  number | null
  change: number | null
  source: MarketSource
}

export interface FXRow {
  pair:   string
  value:  number | null
  change: number | null            // real % change when sourced from Twelve Data; null from Frankfurter (rate-only)
  source: MarketSource
}

export interface MoverRow {
  ticker:    string
  name:      string
  price:     number | null
  change:    number | null
  changeAbs: number | null
  source:    MarketSource
}

export interface CryptoRow {
  symbol:   string          // e.g. "BTC/USD"
  name:     string          // e.g. "Bitcoin"
  price:    number | null
  change:   number | null
  source:   MarketSource
}

export interface MarketMeta {
  fetchedAt:     string            // ISO timestamp this payload was built
  hasAnyLive:    boolean           // did ANY section return at least one real value?
  tdKeyPresent:  boolean           // is TWELVE_DATA_API_KEY configured server-side?
  tdRateLimited: boolean           // did Twelve Data return a 429 on this fetch?
  sources: {
    indices:     MarketSource
    commodities: MarketSource
    fx:          MarketSource
    stocks:      MarketSource
    crypto:      MarketSource
  }
}

export interface MarketSummaryResponse {
  asx:         { price: number; change: number; changeAbs: number } | null
  indices:     IndexRow[]
  commodities: CommodityRow[]
  fx:          FXRow[]
  topMovers:   MoverRow[]
  crypto:      CryptoRow[]
  meta:        MarketMeta
}

// ─── Pure presentation helpers (client-safe) ─────────────────────────────────

/** Human label for a data source, used in the UI provenance chips. */
export function sourceLabel(s: MarketSource): string {
  switch (s) {
    case 'twelvedata':  return 'Twelve Data'
    case 'stooq':       return 'Stooq'
    case 'frankfurter': return 'ECB'
    default:            return '—'
  }
}

/**
 * Freshness label for a source. Twelve Data quotes are real-time / near-real-time
 * on the free tier (forex, crypto, US equities, metals); Stooq index/equity data
 * is end-of-day / delayed; Frankfurter is the ECB daily reference rate.
 */
export function freshnessLabel(s: MarketSource): 'Live' | 'Delayed' | 'Daily' | '' {
  switch (s) {
    case 'twelvedata':  return 'Live'
    case 'stooq':       return 'Delayed'
    case 'frankfurter': return 'Daily'
    default:            return ''
  }
}
