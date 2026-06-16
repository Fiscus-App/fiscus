/**
 * /api/market/live  — Edge Runtime
 *
 * Fetches live price + 1-year weekly chart for a single asset from Yahoo Finance.
 * Must be Edge Runtime — Yahoo Finance blocks Vercel Lambda (AWS) IPs.
 *
 * Usage: GET /api/market/live?symbol=CBA.AX
 *        GET /api/market/live?symbol=TSLA
 *        GET /api/market/live?symbol=GC%3DF   (GC=F gold)
 *        GET /api/market/live?symbol=%5EAXJO  (^AXJO ASX200)
 */

export const runtime = 'edge'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

interface LiveResult {
  price:     number | null
  change:    number | null   // % change
  changeAbs: number | null
  prevClose: number | null
  chart:     number[]        // weekly closes, up to 52 points
  isLive:    boolean
}

async function fetchYahoo(symbol: string): Promise<LiveResult> {
  const base: LiveResult = { price: null, change: null, changeAbs: null, prevClose: null, chart: [], isLive: false }

  const headers = {
    'User-Agent':      UA,
    'Accept':          'application/json, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer':         'https://finance.yahoo.com/',
  }

  try {
    // Fetch quote + 1y chart in parallel
    const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}&fields=regularMarketPrice,regularMarketChangePercent,regularMarketChange,regularMarketPreviousClose`
    const chartUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1wk&range=1y`

    const [quoteRes, chartRes] = await Promise.all([
      fetch(quoteUrl, { headers, signal: AbortSignal.timeout(8000) }),
      fetch(chartUrl, { headers, signal: AbortSignal.timeout(8000) }),
    ])

    // ── Quote ──────────────────────────────────────────────────────────────
    if (quoteRes.ok) {
      const qj = await quoteRes.json() as {
        quoteResponse?: {
          result?: {
            regularMarketPrice?: number
            regularMarketChangePercent?: number
            regularMarketChange?: number
            regularMarketPreviousClose?: number
          }[]
        }
      }
      const r = qj?.quoteResponse?.result?.[0]
      if (r?.regularMarketPrice) {
        base.price     = r.regularMarketPrice
        base.change    = r.regularMarketChangePercent    ?? null
        base.changeAbs = r.regularMarketChange           ?? null
        base.prevClose = r.regularMarketPreviousClose    ?? null
        base.isLive    = true
      }
    }

    // ── Chart ──────────────────────────────────────────────────────────────
    if (chartRes.ok) {
      const cj = await chartRes.json() as {
        chart?: {
          result?: {
            indicators?: { quote?: { close?: (number | null)[] }[] }
          }[]
        }
      }
      const closes = cj?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []
      base.chart = closes
        .filter((c): c is number => c !== null && !isNaN(c))
        .map(c => Math.round(c * 1000) / 1000)
    }

  } catch (err) {
    console.error('[market/live] Yahoo fetch failed for', symbol, err)
  }

  return base
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')

  if (!symbol) {
    return Response.json({ error: 'Provide ?symbol=CBA.AX' }, { status: 400 })
  }

  const result = await fetchYahoo(symbol)

  return Response.json(result, {
    headers: { 'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=60' },
  })
}
