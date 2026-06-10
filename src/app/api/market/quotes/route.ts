import { NextRequest, NextResponse } from 'next/server'
import { fetchQuotes } from '@/lib/market/yahoo'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const raw = searchParams.get('tickers') ?? ''
  const tickers = raw.split(',').map((t) => t.trim()).filter(Boolean)

  if (tickers.length === 0) {
    return NextResponse.json({ error: 'Provide ?tickers=CBA,BHP,WDS' }, { status: 400 })
  }

  const quotes = await fetchQuotes(tickers)

  return NextResponse.json(Object.fromEntries(quotes), {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
    },
  })
}
