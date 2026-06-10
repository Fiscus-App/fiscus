import { NextResponse } from 'next/server'

export async function GET() {
  const key = process.env.TWELVE_DATA_API_KEY
  if (!key) return NextResponse.json({ error: 'TWELVE_DATA_API_KEY not set' }, { status: 500 })

  // Test a small sample of symbols
  const testSymbols = ['CBA:ASX', 'BHP:ASX', 'AUD/USD', 'XAU/USD', 'AXJO', 'SPX', 'WTI/USD']
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(testSymbols.join(','))}&apikey=${key}`

  const res = await fetch(url, { cache: 'no-store' })
  const raw = await res.json()

  return NextResponse.json({ status: res.status, keyPrefix: key.slice(0, 6) + '...', raw })
}
