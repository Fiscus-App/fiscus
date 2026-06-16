/**
 * Offline self-test for the Twelve Data normalization layer.
 *
 * The sandbox / CI cannot reach api.twelvedata.com, so this harness mocks
 * globalThis.fetch and feeds representative payloads through the REAL
 * fetchTwelveDataQuotes() to prove the parser handles every failure mode the
 * Markets page can encounter — without ever throwing.
 *
 * Run:  npx tsx scripts/market-selftest.ts
 */

import { fetchTwelveDataQuotes } from '../src/lib/market/twelvedata'
import { sourceLabel, freshnessLabel } from '../src/lib/market/types'

type MockNext = { status?: number; body?: unknown; throw?: boolean }
let nextResponse: MockNext = {}

// Mock fetch — ignores the URL, returns whatever the current test queued.
globalThis.fetch = (async () => {
  if (nextResponse.throw) throw new Error('simulated network failure')
  const status = nextResponse.status ?? 200
  const body = typeof nextResponse.body === 'string'
    ? nextResponse.body
    : JSON.stringify(nextResponse.body ?? {})
  return new Response(body, { status, headers: { 'content-type': 'application/json' } })
}) as typeof fetch

let passed = 0
let failed = 0
function check(name: string, cond: boolean, detail = '') {
  if (cond) { passed++; console.log(`  ✓ ${name}`) }
  else      { failed++; console.error(`  ✗ ${name}  ${detail}`) }
}

async function run() {
  const KEY = 'TWELVE_DATA_API_KEY'

  console.log('\nTwelve Data normalizer — offline stress tests\n')

  // 1) Missing API key → no_key, never a crash
  delete process.env[KEY]
  nextResponse = { body: {} }
  let r = await fetchTwelveDataQuotes(['AUD/USD'])
  check('missing key → status "no_key"', r.status === 'no_key' && r.quotes.size === 0)

  // From here on a key is present.
  process.env[KEY] = 'test-key'

  // 2) HTTP 429 rate limit
  nextResponse = { status: 429, body: { code: 429, message: 'too many requests', status: 'error' } }
  r = await fetchTwelveDataQuotes(['AUD/USD'])
  check('HTTP 429 → status "rate_limited"', r.status === 'rate_limited')

  // 3) Body-level 429 (HTTP 200 but error body — TD free-tier credit exhaustion)
  nextResponse = { status: 200, body: { code: 429, status: 'error', message: 'You have run out of API credits for the current minute' } }
  r = await fetchTwelveDataQuotes(['AUD/USD'])
  check('body code 429 → status "rate_limited"', r.status === 'rate_limited')

  // 4) Valid batch (2 forex symbols) with explicit percent_change
  nextResponse = { body: {
    'AUD/USD': { symbol: 'AUD/USD', close: '0.6612', previous_close: '0.6580', change: '0.0032', percent_change: '0.48632', is_market_open: true },
    'AUD/JPY': { symbol: 'AUD/JPY', close: '101.250', previous_close: '100.900', change: '0.350', percent_change: '0.34688', is_market_open: true },
  } }
  r = await fetchTwelveDataQuotes(['AUD/USD', 'AUD/JPY'])
  const audusd = r.quotes.get('AUD/USD')
  check('valid batch → status "ok", 2 quotes', r.status === 'ok' && r.quotes.size === 2)
  check('batch parses price + % change', !!audusd && Math.abs(audusd.price - 0.6612) < 1e-9 && Math.abs(audusd.change - 0.48632) < 1e-3)

  // 5) Single symbol → bare object shape (no outer key)
  nextResponse = { body: { symbol: 'AAPL', name: 'Apple Inc', close: '195.12', previous_close: '193.00', change: '2.12', percent_change: '1.0984' } }
  r = await fetchTwelveDataQuotes(['AAPL'])
  check('single bare object → status "ok", 1 quote', r.status === 'ok' && r.quotes.size === 1 && !!r.quotes.get('AAPL'))

  // 6) Partial: one OK, one per-symbol error (e.g. ASX equity not on free plan)
  nextResponse = { body: {
    'XAU/USD':  { symbol: 'XAU/USD', close: '2350.40', previous_close: '2340.00', change: '10.40', percent_change: '0.4444' },
    'CBA:ASX':  { code: 404, status: 'error', message: 'symbol not available on your plan' },
  } }
  r = await fetchTwelveDataQuotes(['XAU/USD', 'CBA:ASX'])
  check('partial (1 ok, 1 plan-error) → "ok" with only the valid quote', r.status === 'ok' && r.quotes.size === 1 && !!r.quotes.get('XAU/USD') && !r.quotes.get('CBA:ASX'))

  // 7) Empty object response (no data)
  nextResponse = { body: {} }
  r = await fetchTwelveDataQuotes(['FOO', 'BAR'])
  check('empty {} → "ok", 0 quotes (no crash)', r.status === 'ok' && r.quotes.size === 0)

  // 8) Derive change from previous_close when TD omits percent_change/change
  nextResponse = { body: { symbol: 'WTI/USD', close: '80.00', previous_close: '79.00' } }
  r = await fetchTwelveDataQuotes(['WTI/USD'])
  const wti = r.quotes.get('WTI/USD')
  check('derives changeAbs from prev close', !!wti && Math.abs((wti.changeAbs) - 1.0) < 1e-9)
  check('derives change % from prev close', !!wti && Math.abs((wti.change) - (1 / 79 * 100)) < 1e-6)

  // 9) Invalid JSON body
  nextResponse = { status: 200, body: '<html>upstream error</html>' }
  r = await fetchTwelveDataQuotes(['AUD/USD'])
  check('invalid JSON → status "error" (no crash)', r.status === 'error')

  // 10) Network failure (fetch throws)
  nextResponse = { throw: true }
  r = await fetchTwelveDataQuotes(['AUD/USD'])
  check('network throw → status "error" (no crash)', r.status === 'error')

  // 11) Zero / invalid price is rejected (no fake $0 prices)
  nextResponse = { body: { symbol: 'BAD', close: '0', previous_close: '0' } }
  r = await fetchTwelveDataQuotes(['BAD'])
  check('zero price rejected → 0 quotes', r.status === 'ok' && r.quotes.size === 0)

  // 12) Empty input short-circuits without a fetch
  r = await fetchTwelveDataQuotes([])
  check('empty symbol list → "ok", 0 quotes', r.status === 'ok' && r.quotes.size === 0)

  // 12b) Free-tier guard: ASX/index symbols are skipped WITHOUT any network call
  //      (fetch is set to throw — if the guard let them through, status="error")
  nextResponse = { throw: true }
  r = await fetchTwelveDataQuotes(['CBA:ASX', 'AXJO', 'SPX'])
  check('blocked ASX/index symbols skipped — no fetch, no credits spent', r.status === 'ok' && r.quotes.size === 0)

  // 12c) Mixed batch: blocked symbols dropped, valid one still fetched
  nextResponse = { body: { 'AUD/USD': { symbol: 'AUD/USD', close: '0.6600', previous_close: '0.6580', percent_change: '0.30' } } }
  r = await fetchTwelveDataQuotes(['AUD/USD', 'BHP:ASX'])
  check('mixed batch → only the valid (FX) symbol returned', r.status === 'ok' && r.quotes.size === 1 && !!r.quotes.get('AUD/USD'))

  // 13) Pure presentation helpers
  check('sourceLabel mapping', sourceLabel('twelvedata') === 'Twelve Data' && sourceLabel('stooq') === 'Stooq' && sourceLabel('frankfurter') === 'ECB')
  check('freshnessLabel mapping', freshnessLabel('twelvedata') === 'Live' && freshnessLabel('stooq') === 'Delayed' && freshnessLabel('frankfurter') === 'Daily')

  console.log(`\n${passed} passed, ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run().catch((e) => { console.error('harness crashed:', e); process.exit(1) })
