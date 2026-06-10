import { NextResponse } from 'next/server'
import { fetchMarketSummary } from '@/lib/market/twelvedata'

export async function GET() {
  const data = await fetchMarketSummary()

  const indices = data.indices.map((i) => ({
    name:      i.name,
    value:     i.quote?.price     ?? null,
    change:    i.quote?.change    ?? null,
    changeAbs: i.quote?.changeAbs ?? null,
  }))

  const commodities = data.commodities.map((c) => ({
    name:   c.name,
    unit:   c.unit,
    value:  c.quote?.price  ?? null,
    change: c.quote?.change ?? null,
  }))

  const fx = data.fx.map((f) => ({
    pair:   f.pair,
    value:  f.quote?.price  ?? null,
    change: f.quote?.change ?? null,
  }))

  const topMovers = data.topMovers.map((m) => ({
    ticker: m.ticker,
    name:   m.name,
    price:  m.quote?.price  ?? null,
    change: m.quote?.change ?? null,
  }))

  const asx = data.asx
    ? { price: data.asx.price, change: data.asx.change, changeAbs: data.asx.changeAbs }
    : null

  return NextResponse.json(
    { indices, commodities, fx, topMovers, asx },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } }
  )
}
