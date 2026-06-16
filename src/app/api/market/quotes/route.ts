import { NextRequest, NextResponse } from 'next/server'
import { fetchQuotesByTicker } from '@/lib/market/twelvedata'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const raw     = searchParams.get('tickers') ?? ''
  const tickers = raw.split(',').map(t => t.trim()).filter(Boolean)

  if (tickers.length === 0) {
    return NextResponse.json({ error: 'Provide ?tickers=CBA,BHP' }, { status: 400 })
  }

  const quotesMap = await fetchQuotesByTicker(tickers).catch(() => new Map())
  const result: Record<string, { price: number; change: number; changeAbs: number }> = {}

  for (const [ticker, q] of Array.from(quotesMap.entries())) {
    result[ticker] = { price: q.price, change: q.change, changeAbs: q.changeAbs }
  }

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=60' },
  })
}
