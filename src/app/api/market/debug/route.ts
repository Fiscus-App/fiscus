import { NextResponse } from 'next/server'
import { fetchAUDRates } from '@/lib/market/frankfurter'
import { fmpQuotes }     from '@/lib/market/fmp'

export async function GET() {
  const tdKey  = process.env.TWELVE_DATA_API_KEY
  const fmpKey = process.env.FMP_API_KEY

  // Test Twelve Data (FX + metals only — the confirmed free symbols)
  let tdResults: Record<string, unknown> = {}
  if (tdKey) {
    const testSymbols = ['AUD/USD', 'XAU/USD', 'XAG/USD', 'AUD/JPY']
    const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(testSymbols.join(','))}&apikey=${tdKey}`
    try {
      const res = await fetch(url, { cache: 'no-store' })
      const raw = await res.json() as Record<string, { status?: string; close?: string; message?: string }>
      for (const sym of testSymbols) {
        const r = raw[sym]
        if (!r) {
          tdResults[sym] = 'missing'
        } else if (r.status === 'error') {
          tdResults[sym] = `ERROR: ${r.message}`
        } else {
          tdResults[sym] = `OK — ${r.close}`
        }
      }
    } catch (e) {
      tdResults = { error: String(e) }
    }
  }

  // Test FMP (stocks + indices)
  let fmpResults: Record<string, unknown> = {}
  if (fmpKey) {
    const testSymbols = ['CBA.AX', 'BHP.AX', '^AXJO', '^GSPC']
    const quotes = await fmpQuotes(testSymbols)
    for (const sym of testSymbols) {
      const q = quotes.find((x) => x.symbol === sym)
      fmpResults[sym] = q ? `OK — $${q.price} (${q.changesPercentage > 0 ? '+' : ''}${q.changesPercentage.toFixed(2)}%)` : 'missing'
    }
  } else {
    fmpResults = { error: 'FMP_API_KEY not set' }
  }

  // Test Frankfurter (no key needed)
  const ff = await fetchAUDRates()

  return NextResponse.json({
    twelveData: {
      keySet: !!tdKey,
      symbols: tdResults,
    },
    fmp: {
      keySet: !!fmpKey,
      symbols: fmpResults,
    },
    frankfurter: {
      status: ff ? 'OK' : 'FAILED',
      date:   ff?.date,
      rates:  ff?.rates,
    },
  })
}
