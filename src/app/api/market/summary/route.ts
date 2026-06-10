import { NextResponse } from 'next/server'
import { fetchMarketSummary, MARKET_SYMBOLS } from '@/lib/market/yahoo'

export const runtime = 'edge'

export async function GET() {
  const data = await fetchMarketSummary()

  // ── Indices ──────────────────────────────────────────────────────────
  const LABEL: Record<string, string> = {
    '^AXJO': 'ASX 200',
    '^GSPC': 'S&P 500',
    '^N225': 'Nikkei',
    '^FTSE': 'FTSE 100',
  }

  const indices = MARKET_SYMBOLS.indices.map((sym) => {
    const q = data[sym]
    return {
      name:   LABEL[sym] ?? sym,
      symbol: sym,
      value:  q?.price    ?? null,
      change: q?.change   ?? null,
      changeAbs: q?.changeAbs ?? null,
    }
  })

  // ── Commodities ───────────────────────────────────────────────────────
  const COMM_LABEL: Record<string, { name: string; unit: string }> = {
    'GC=F': { name: 'Gold',   unit: '/oz'  },
    'CL=F': { name: 'WTI Oil', unit: '/bbl' },
    'HG=F': { name: 'Copper', unit: '/lb'  },
    'SI=F': { name: 'Silver', unit: '/oz'  },
  }

  const commodities = MARKET_SYMBOLS.commodities.map((sym) => {
    const q    = data[sym]
    const meta = COMM_LABEL[sym] ?? { name: sym, unit: '' }
    return {
      name:   meta.name,
      unit:   meta.unit,
      symbol: sym,
      value:  q?.price  ?? null,
      change: q?.change ?? null,
    }
  })

  // ── FX ────────────────────────────────────────────────────────────────
  const FX_LABEL: Record<string, string> = {
    'AUDUSD=X': 'AUD/USD',
    'AUDCNY=X': 'AUD/CNY',
    'AUDJPY=X': 'AUD/JPY',
    'AUDEUR=X': 'AUD/EUR',
  }

  const fx = MARKET_SYMBOLS.fx.map((sym) => {
    const q = data[sym]
    return {
      pair:   FX_LABEL[sym] ?? sym,
      symbol: sym,
      value:  q?.price  ?? null,
      change: q?.change ?? null,
    }
  })

  // ── Top ASX Movers ────────────────────────────────────────────────────
  const TICKER_LABEL: Record<string, string> = {
    'CBA.AX': 'Commonwealth Bank',
    'BHP.AX': 'BHP Group',
    'WDS.AX': 'Woodside Energy',
    'RIO.AX': 'Rio Tinto',
    'FMG.AX': 'Fortescue',
    'CSL.AX': 'CSL Limited',
    'NAB.AX': 'National Australia Bank',
    'ANZ.AX': 'ANZ Group',
  }

  const topMovers = MARKET_SYMBOLS.topAsx
    .map((sym) => {
      const q = data[sym]
      return {
        ticker: sym.replace('.AX', ''),
        name:   TICKER_LABEL[sym] ?? sym,
        symbol: sym,
        price:  q?.price  ?? null,
        change: q?.change ?? null,
      }
    })
    .filter((m) => m.price !== null)
    .sort((a, b) => Math.abs(b.change ?? 0) - Math.abs(a.change ?? 0))

  // ── ASX 200 history stub (real history via 4.1.4) ─────────────────────
  const asx = data['^AXJO']

  return NextResponse.json(
    { indices, commodities, fx, topMovers, asx: asx ?? null },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    },
  )
}
