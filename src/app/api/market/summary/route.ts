import { NextResponse } from 'next/server'
import { fetchMarketSummary } from '@/lib/market/twelvedata'
import { fetchAUDRates }      from '@/lib/market/frankfurter'
import { fmpQuotes, quotesMap } from '@/lib/market/fmp'

// ── Symbols ──────────────────────────────────────────────────────────────────

// FMP: ASX stocks use .AX suffix; indices use ^ prefix
const FMP_STOCKS  = ['CBA.AX', 'BHP.AX', 'WDS.AX', 'RIO.AX', 'FMG.AX', 'CSL.AX', 'NAB.AX', 'ANZ.AX']
const FMP_INDICES = ['^AXJO', '^GSPC', '^N225', '^FTSE']
const FMP_ALL     = [...FMP_STOCKS, ...FMP_INDICES]

// Display names keyed by FMP symbol
const STOCK_NAMES: Record<string, string> = {
  'CBA.AX': 'Commonwealth Bank',
  'BHP.AX': 'BHP Group',
  'WDS.AX': 'Woodside Energy',
  'RIO.AX': 'Rio Tinto',
  'FMG.AX': 'Fortescue',
  'CSL.AX': 'CSL Limited',
  'NAB.AX': 'Natl Australia Bank',
  'ANZ.AX': 'ANZ Group',
}

const INDEX_NAMES: Record<string, string> = {
  '^AXJO': 'ASX 200',
  '^GSPC': 'S&P 500',
  '^N225': 'Nikkei',
  '^FTSE': 'FTSE 100',
}

export async function GET() {
  // Fetch all three sources in parallel
  const [td, fxBackup, fmpData] = await Promise.all([
    fetchMarketSummary(),   // Twelve Data: FX pairs + metals (confirmed free)
    fetchAUDRates(),        // Frankfurter: FX backup (always free)
    fmpQuotes(FMP_ALL),     // FMP: ASX stocks + global indices
  ])

  const fmp = quotesMap(fmpData)

  // ── FX (Twelve Data real-time → Frankfurter ECB backup) ──────────────────

  const fbRates: Record<string, number> = {}
  if (fxBackup?.rates) {
    if (fxBackup.rates.USD) fbRates['AUD/USD'] = fxBackup.rates.USD
    if (fxBackup.rates.CNY) fbRates['AUD/CNY'] = fxBackup.rates.CNY
    if (fxBackup.rates.JPY) fbRates['AUD/JPY'] = fxBackup.rates.JPY
    if (fxBackup.rates.EUR) fbRates['AUD/EUR'] = fxBackup.rates.EUR
  }

  const fx = td.fx.map((f) => {
    const tdVal     = f.quote?.price  ?? null
    const backupVal = fbRates[f.pair] ?? null
    return {
      pair:   f.pair,
      value:  tdVal ?? backupVal,
      change: f.quote?.change ?? null,
      source: tdVal !== null ? 'live' : backupVal !== null ? 'ecb' : null,
    }
  })

  // ── Commodities (Twelve Data: XAU/USD, XAG/USD are free FX pairs) ────────

  const commodities = td.commodities.map((c) => ({
    name:   c.name,
    unit:   c.unit,
    value:  c.quote?.price  ?? null,
    change: c.quote?.change ?? null,
  }))

  // ── Indices (FMP) ─────────────────────────────────────────────────────────

  const indices = FMP_INDICES.map((sym) => {
    const q = fmp.get(sym)
    return {
      name:      INDEX_NAMES[sym] ?? sym,
      value:     q?.price              ?? null,
      change:    q?.changesPercentage  ?? null,
      changeAbs: q?.change             ?? null,
    }
  })

  // ── ASX Top Stocks (FMP, sorted by absolute % change) ────────────────────

  const topMovers = FMP_STOCKS
    .map((sym) => {
      const q = fmp.get(sym)
      return {
        ticker: sym.replace('.AX', ''),
        name:   STOCK_NAMES[sym] ?? sym,
        price:  q?.price             ?? null,
        change: q?.changesPercentage ?? null,
      }
    })
    .sort((a, b) => Math.abs(b.change ?? 0) - Math.abs(a.change ?? 0))

  // ── ASX 200 hero (from FMP index data) ───────────────────────────────────

  const axjoFMP = fmp.get('^AXJO')
  const asx = axjoFMP
    ? { price: axjoFMP.price, change: axjoFMP.changesPercentage, changeAbs: axjoFMP.change }
    : null

  // ── Metadata ──────────────────────────────────────────────────────────────

  const hasLiveStocks      = topMovers.some((m) => m.price  !== null)
  const hasLiveCommodities = commodities.some((c) => c.value !== null)
  const hasLiveIndices     = indices.some((i) => i.value !== null)
  const hasLiveFX          = fx.some((f) => f.value !== null)
  const hasAnyLive         = hasLiveStocks || hasLiveCommodities || hasLiveIndices || hasLiveFX

  return NextResponse.json(
    {
      indices,
      commodities,
      fx,
      topMovers,
      asx,
      meta: {
        fetchedAt:          new Date().toISOString(),
        hasAnyLive,
        hasLiveStocks,
        hasLiveFX,
        hasLiveIndices,
        hasLiveCommodities,
        fxDate:             fxBackup?.date ?? null,
      },
    },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } }
  )
}
