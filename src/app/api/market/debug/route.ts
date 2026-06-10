import { NextResponse } from 'next/server'
import { fetchAUDRates } from '@/lib/market/frankfurter'

export async function GET() {
  const key = process.env.TWELVE_DATA_API_KEY
  if (!key) return NextResponse.json({ error: 'TWELVE_DATA_API_KEY not set' }, { status: 500 })

  // Test a small set of symbols that cover each category
  const testSymbols = [
    'CBA:ASX',   // ASX stock
    'BHP:ASX',   // ASX stock
    'AUD/USD',   // FX (real-time on free tier)
    'XAU/USD',   // Gold (real-time on free tier)
    'AXJO',      // ASX 200 index — may not work on free tier
    'SPX',       // S&P 500 index
    'WTI/USD',   // WTI Oil — symbol may need to be 'USOIL'
  ]

  const tdUrl = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(testSymbols.join(','))}&apikey=${key}`

  const [tdRes, ffRates] = await Promise.all([
    fetch(tdUrl, { cache: 'no-store' }),
    fetchAUDRates(),
  ])

  const tdRaw = await tdRes.json()

  // Parse each symbol result to show status clearly
  type SymbolResult = { status: string; price?: string; error?: string }
  const results: Record<string, SymbolResult> = {}
  for (const sym of testSymbols) {
    const r = tdRaw[sym]
    if (!r) {
      results[sym] = { status: 'missing — not in response' }
    } else if (r.status === 'error' || r.code) {
      results[sym] = { status: 'ERROR', error: r.message ?? JSON.stringify(r) }
    } else {
      results[sym] = { status: 'OK', price: r.close }
    }
  }

  return NextResponse.json({
    twelveData: {
      keyPrefix: key.slice(0, 6) + '...',
      httpStatus: tdRes.status,
      symbols: results,
    },
    frankfurter: {
      status: ffRates ? 'OK' : 'FAILED',
      date:   ffRates?.date,
      rates:  ffRates?.rates,
    },
  })
}
