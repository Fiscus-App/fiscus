import { NextResponse } from 'next/server'
import { fetchMarketSummary }      from '@/lib/market/twelvedata'
import { fetchAUDRates }           from '@/lib/market/frankfurter'
import { fmpQuotes, quotesMap }    from '@/lib/market/fmp'
import { fetchASXQuotes, fetchXJO } from '@/lib/market/asx'

// ── Symbol maps ──────────────────────────────────────────────────────────────

// FMP uses .AX suffix for ASX stocks, ^ prefix for indices
const FMP_STOCKS  = ['CBA.AX', 'BHP.AX', 'WDS.AX', 'RIO.AX', 'FMG.AX', 'CSL.AX', 'NAB.AX', 'ANZ.AX']
const FMP_INDICES = ['^AXJO', '^GSPC', '^N225', '^FTSE']

// ASX direct: just the ticker code (no suffix)
const ASX_STOCKS  = ['CBA', 'BHP', 'WDS', 'RIO', 'FMG', 'CSL', 'NAB', 'ANZ']

const STOCK_NAMES: Record<string, string> = {
  CBA: 'Commonwealth Bank',
  BHP: 'BHP Group',
  WDS: 'Woodside Energy',
  RIO: 'Rio Tinto',
  FMG: 'Fortescue',
  CSL: 'CSL Limited',
  NAB: 'Natl Australia Bank',
  ANZ: 'ANZ Group',
}

const INDEX_NAMES: Record<string, string> = {
  '^AXJO': 'ASX 200',
  '^GSPC': 'S&P 500',
  '^N225': 'Nikkei',
  '^FTSE': 'FTSE 100',
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET() {
  // Fetch all sources in parallel
  const [td, fxBackup, fmpData] = await Promise.all([
    fetchMarketSummary(),   // Twelve Data: FX pairs + gold (confirmed free)
    fetchAUDRates(),        // Frankfurter: FX backup (always works)
    fmpQuotes([...FMP_STOCKS, ...FMP_INDICES]).catch(() => []),
  ])

  const fmp = quotesMap(fmpData)

  // ── Determine if FMP is working ──────────────────────────────────────────

  const fmpWorking = fmpData.length > 0

  // If FMP failed, fetch from ASX direct API as fallback
  let asxStocks = new Map<string, import('@/lib/market/asx').ASXQuote>()
  let asxIndex:  import('@/lib/market/asx').ASXQuote | null = null

  if (!fmpWorking) {
    const [stockMap, xjo] = await Promise.all([
      fetchASXQuotes(ASX_STOCKS),
      fetchXJO(),
    ])
    asxStocks = stockMap
    asxIndex  = xjo
    if (stockMap.size > 0 || xjo) {
      console.info('[Market] FMP unavailable, using ASX direct API')
    }
  }

  // ── FX (Twelve Data real-time → Frankfurter ECB backup) ─────────────────

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

  // ── Commodities (Twelve Data free FX-style metals) ───────────────────────

  const commodities = td.commodities.map((c) => ({
    name:   c.name,
    unit:   c.unit,
    value:  c.quote?.price  ?? null,
    change: c.quote?.change ?? null,
  }))

  // ── Global indices ───────────────────────────────────────────────────────

  const indices = FMP_INDICES.map((sym) => {
    if (fmpWorking) {
      const q = fmp.get(sym)
      return {
        name:      INDEX_NAMES[sym],
        value:     q?.price             ?? null,
        change:    q?.changesPercentage ?? null,
        changeAbs: q?.change            ?? null,
      }
    }
    // ASX fallback: only have XJO
    if (sym === '^AXJO' && asxIndex) {
      return {
        name:      'ASX 200',
        value:     asxIndex.price,
        change:    asxIndex.changePct,
        changeAbs: asxIndex.change,
      }
    }
    return { name: INDEX_NAMES[sym], value: null, change: null, changeAbs: null }
  })

  // ── ASX Top Stocks ───────────────────────────────────────────────────────

  const topMovers = ASX_STOCKS.map((ticker) => {
    if (fmpWorking) {
      const q = fmp.get(`${ticker}.AX`)
      return {
        ticker,
        name:   STOCK_NAMES[ticker],
        price:  q?.price             ?? null,
        change: q?.changesPercentage ?? null,
      }
    }
    // ASX direct fallback
    const q = asxStocks.get(ticker)
    return {
      ticker,
      name:   STOCK_NAMES[ticker],
      price:  q?.price     ?? null,
      change: q?.changePct ?? null,
    }
  }).sort((a, b) => Math.abs(b.change ?? 0) - Math.abs(a.change ?? 0))

  // ── ASX 200 hero ─────────────────────────────────────────────────────────

  let asx: { price: number; change: number; changeAbs: number } | null = null
  if (fmpWorking) {
    const q = fmp.get('^AXJO')
    if (q) asx = { price: q.price, change: q.changesPercentage, changeAbs: q.change }
  } else if (asxIndex) {
    asx = { price: asxIndex.price, change: asxIndex.changePct, changeAbs: asxIndex.change }
  }

  // ── Metadata ─────────────────────────────────────────────────────────────

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
        dataSource:         fmpWorking ? 'fmp' : asxStocks.size > 0 ? 'asx' : 'none',
      },
    },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } }
  )
}
