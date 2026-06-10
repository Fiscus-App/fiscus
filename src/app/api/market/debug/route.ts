import { NextResponse } from 'next/server'
import { fetchAUDRates } from '@/lib/market/frankfurter'

export async function GET() {
  const tdKey  = process.env.TWELVE_DATA_API_KEY
  const fmpKey = process.env.FMP_API_KEY

  // ── Twelve Data: test confirmed-free symbols ──────────────────────────────
  let tdResults: Record<string, string> = {}
  if (tdKey) {
    const syms = ['AUD/USD', 'XAU/USD', 'AUD/JPY']
    try {
      const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(syms.join(','))}&apikey=${tdKey}`
      const res = await fetch(url, { cache: 'no-store' })
      const raw = await res.json() as Record<string, { status?: string; close?: string; message?: string }>
      for (const s of syms) {
        const r = raw[s]
        if (!r)                  tdResults[s] = 'missing'
        else if (r.status === 'error') tdResults[s] = `ERROR: ${r.message}`
        else                     tdResults[s] = `OK — ${r.close}`
      }
    } catch (e) { tdResults = { error: String(e) } }
  } else {
    tdResults = { error: 'TWELVE_DATA_API_KEY not set' }
  }

  // ── FMP v3: test stocks + US index (raw response exposed for diagnosis) ───
  let fmpResult: {
    keySet: boolean
    url?: string
    httpStatus?: number
    isArray?: boolean
    count?: number
    symbols?: Record<string, string>
    rawSample?: unknown
    error?: string
  } = { keySet: !!fmpKey }

  if (fmpKey) {
    const testSymbols = ['AAPL', 'CBA.AX', '^GSPC']   // AAPL must work if key is valid
    const symbolStr   = testSymbols.join(',')
    const url = `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(symbolStr)}?apikey=${fmpKey}`
    fmpResult.url = url.replace(fmpKey, '***KEY***')

    try {
      const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
      const text = await res.text()
      fmpResult.httpStatus = res.status

      let data: unknown
      try { data = JSON.parse(text) } catch { data = text.slice(0, 300) }

      if (Array.isArray(data)) {
        fmpResult.isArray   = true
        fmpResult.count     = data.length
        fmpResult.rawSample = data[0] ?? null
        const symbols: Record<string, string> = {}
        for (const sym of testSymbols) {
          const q = (data as Array<{ symbol: string; price?: number; changesPercentage?: number }>)
            .find((x) => x.symbol === sym)
          symbols[sym] = q
            ? `OK — $${q.price} (${(q.changesPercentage ?? 0) > 0 ? '+' : ''}${(q.changesPercentage ?? 0).toFixed(2)}%)`
            : 'missing — symbol not in response'
        }
        fmpResult.symbols = symbols
      } else {
        fmpResult.isArray   = false
        fmpResult.rawSample = data   // shows the error message from FMP
      }
    } catch (e) {
      fmpResult.error = String(e)
    }
  }

  // ── ASX direct: test one stock ────────────────────────────────────────────
  let asxResult: { status: string; price?: number; change?: string } = { status: 'untested' }
  try {
    const res = await fetch('https://www.asx.com.au/asx/1/share/CBA', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.asx.com.au/',
      },
      cache:  'no-store',
      signal: AbortSignal.timeout(6000),
    })
    if (res.ok) {
      const d = await res.json() as { last_price?: number; change_in_percent?: string }
      asxResult = { status: 'OK', price: d.last_price, change: d.change_in_percent }
    } else {
      asxResult = { status: `HTTP ${res.status}` }
    }
  } catch (e) {
    asxResult = { status: `ERROR: ${String(e).slice(0, 100)}` }
  }

  // ── Frankfurter ───────────────────────────────────────────────────────────
  const ff = await fetchAUDRates()

  return NextResponse.json({
    twelveData:  { keySet: !!tdKey, symbols: tdResults },
    fmp:         fmpResult,
    asxDirect:   asxResult,
    frankfurter: { status: ff ? 'OK' : 'FAILED', date: ff?.date, rates: ff?.rates },
  })
}
