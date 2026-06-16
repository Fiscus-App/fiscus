import { NextResponse } from 'next/server'
import { fetchAUDRates } from '@/lib/market/frankfurter'

export async function GET() {
  const tdKey  = process.env.TWELVE_DATA_API_KEY
  const fmpKey = process.env.FMP_API_KEY

  // ── Twelve Data ───────────────────────────────────────────────────────────
  let tdResults: Record<string, string> = {}
  if (tdKey) {
    const syms = ['AUD/USD', 'XAU/USD', 'XAG/USD', 'WTI/USD', 'AXJO', 'SPX', 'NI225', 'UKX', 'CBA:ASX', 'BHP:ASX']
    try {
      const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(syms.join(','))}&apikey=${tdKey}`
      const res = await fetch(url, { cache: 'no-store' })
      const raw = await res.json() as Record<string, { status?: string; close?: string; message?: string; code?: number }>
      for (const s of syms) {
        const r = raw[s]
        if (!r)                               tdResults[s] = 'missing'
        else if (r.status === 'error')        tdResults[s] = `ERROR: ${r.message}`
        else if (r.code)                      tdResults[s] = `CODE ${r.code}: ${r.message}`
        else if (!r.close)                    tdResults[s] = `NO PRICE: ${JSON.stringify(r).slice(0,100)}`
        else                                  tdResults[s] = `OK — ${r.close}`
      }
    } catch (e) { tdResults = { error: String(e) } }
  } else {
    tdResults = { error: 'TWELVE_DATA_API_KEY not set' }
  }

  // ── FMP v3 ────────────────────────────────────────────────────────────────
  let fmpResult: {
    keySet: boolean; url?: string; httpStatus?: number
    isArray?: boolean; count?: number; symbols?: Record<string, string>
    rawSample?: unknown; error?: string
  } = { keySet: !!fmpKey }

  if (fmpKey) {
    const testSymbols = ['AAPL', 'CBA.AX', '^GSPC']
    const url = `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(testSymbols.join(','))}?apikey=${fmpKey}`
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
          const q = (data as Array<{ symbol: string; price?: number; changesPercentage?: number }>).find((x) => x.symbol === sym)
          symbols[sym] = q ? `OK — $${q.price} (${q.changesPercentage?.toFixed(2)}%)` : 'missing'
        }
        fmpResult.symbols = symbols
      } else {
        fmpResult.isArray = false; fmpResult.rawSample = data
      }
    } catch (e) { fmpResult.error = String(e) }
  }

  // ── Stooq CSV (tests if Lambda can reach stooq.com) ──────────────────────
  // Stooq is an academic financial data aggregator — might not block AWS IPs
  const stooqTests: Record<string, string> = {}
  const stooqSyms: Record<string, string> = {
    'CBA (ASX)':  'cba.au',
    'BHP (ASX)':  'bhp.au',
    'ASX 200':    '^axjo',
    'S&P 500':    '^spx',
  }
  for (const [label, sym] of Object.entries(stooqSyms)) {
    try {
      const res = await fetch(
        `https://stooq.com/q/l/?s=${sym}&f=sd2t2ohlcv&h&e=csv`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept':     'text/csv,text/plain,*/*',
          },
          cache:  'no-store',
          signal: AbortSignal.timeout(8000),
        }
      )
      if (!res.ok) {
        stooqTests[label] = `HTTP ${res.status}`
        continue
      }
      const text = await res.text()
      const lines = text.trim().split('\n')
      if (lines.length < 2) { stooqTests[label] = `empty: ${text.slice(0, 80)}`; continue }
      const parts = lines[1].split(',')
      const close = parseFloat(parts[6])
      const open  = parseFloat(parts[3])
      if (!close || close <= 0 || isNaN(close)) {
        stooqTests[label] = `bad data: ${lines[1].slice(0, 60)}`
      } else {
        const pct = open ? (((close - open) / open) * 100).toFixed(2) : '0'
        stooqTests[label] = `OK — ${close} (intraday ${pct}%)`
      }
    } catch (e) {
      stooqTests[label] = `ERROR: ${String(e).slice(0, 80)}`
    }
  }

  // ── Yahoo Finance (server-side, expected to be blocked) ───────────────────
  let yahooResult: { status: string; price?: number } = { status: 'untested' }
  try {
    const res = await fetch('https://query1.finance.yahoo.com/v7/finance/quote?symbols=CBA.AX', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept':     'application/json',
      },
      cache:  'no-store',
      signal: AbortSignal.timeout(6000),
    })
    if (res.ok) {
      const d = await res.json() as { quoteResponse?: { result?: Array<{ regularMarketPrice?: number }> } }
      yahooResult = { status: 'OK', price: d?.quoteResponse?.result?.[0]?.regularMarketPrice }
    } else {
      const text = await res.text()
      yahooResult = { status: `HTTP ${res.status} — ${text.slice(0, 100)}` }
    }
  } catch (e) {
    yahooResult = { status: `ERROR: ${String(e).slice(0, 100)}` }
  }

  // ── ASX direct ────────────────────────────────────────────────────────────
  let asxResult: { status: string; price?: number } = { status: 'untested' }
  try {
    const res = await fetch('https://www.asx.com.au/asx/1/share/CBA', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', 'Referer': 'https://www.asx.com.au/' },
      cache: 'no-store', signal: AbortSignal.timeout(6000),
    })
    if (res.ok) {
      const d = await res.json() as { last_price?: number }
      asxResult = { status: 'OK', price: d.last_price }
    } else {
      asxResult = { status: `HTTP ${res.status}` }
    }
  } catch (e) {
    asxResult = { status: `ERROR: ${String(e).slice(0, 80)}` }
  }

  // ── Frankfurter ───────────────────────────────────────────────────────────
  const ff = await fetchAUDRates()

  return NextResponse.json({
    twelveData:  { keySet: !!tdKey, symbols: tdResults },
    fmp:         fmpResult,
    stooq:       stooqTests,
    yahooServer: yahooResult,
    asxDirect:   asxResult,
    frankfurter: { status: ff ? 'OK' : 'FAILED', rates: ff?.rates },
    summary:     {
      stooqWorksFromLambda: Object.values(stooqTests).some(v => v.startsWith('OK')),
      yahooWorksFromServer: yahooResult.status.startsWith('OK'),
      asxWorksFromServer:   asxResult.status.startsWith('OK'),
    },
  })
}
