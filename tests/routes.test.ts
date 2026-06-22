import { describe, it, expect, beforeAll, vi } from 'vitest'

// Force the offline, no-DB code paths so handlers run fast and deterministically:
//  - db mocked as unavailable → article queries skipped entirely
//  - no TWELVE_DATA_API_KEY → live-quote fetch returns immediately (no network)
vi.mock('@/lib/db', () => ({ db: {}, dbAvailable: false }))

beforeAll(() => {
  delete process.env.TWELVE_DATA_API_KEY
})

async function searchGET(q: string) {
  const { GET } = await import('@/app/api/search/route')
  const { NextRequest } = await import('next/server')
  const res = await GET(new NextRequest(`http://localhost/api/search?q=${encodeURIComponent(q)}`))
  return { status: res.status, json: await res.json() }
}

async function assetGET(ticker: string) {
  const { GET } = await import('@/app/api/asset/[ticker]/route')
  const res = await GET({} as never, { params: { ticker } })
  return { status: res.status, json: await res.json() }
}

describe('/api/search route', () => {
  it('returns AAPL as the top asset for "apple"', async () => {
    const { status, json } = await searchGET('apple')
    expect(status).toBe(200)
    expect(json.stocks[0].ticker).toBe('AAPL')
    expect(Array.isArray(json.articles)).toBe(true)
  })

  it('returns browse categories for an empty query', async () => {
    const { json } = await searchGET('')
    expect(json.stocks).toEqual([])
    expect(Array.isArray(json.browse)).toBe(true)
    expect(json.browse.length).toBeGreaterThan(0)
    // every browse row is a real asset with a ticker
    expect(json.browse[0].stocks[0].ticker).toBeTruthy()
  })

  it('returns an empty asset list for nonsense', async () => {
    const { json } = await searchGET('zzzznotathing')
    expect(json.stocks).toEqual([])
  })
})

describe('/api/asset/[ticker] route', () => {
  it('returns a structured profile for a known ticker (no fake price when offline)', async () => {
    const { status, json } = await assetGET('AAPL')
    expect(status).toBe(200)
    expect(json.profile.ticker).toBe('AAPL')
    expect(json.profile.name).toMatch(/Apple/)
    expect(json.profile.type).toBe('STOCK')
    // Offline → no live source → price is null (never a fabricated number / NaN)
    expect(json.profile.price).toBeNull()
    expect(json.profile.isLive).toBe(false)
    expect(Array.isArray(json.chart)).toBe(true)
  })

  it('resolves universe metadata for an ASX ticker', { timeout: 15000 }, async () => {
    const { status, json } = await assetGET('cba')
    expect(status).toBe(200)
    expect(json.profile.ticker).toBe('CBA')
    expect(json.profile.exchange).toBe('ASX')
    // price is either a real Stooq number or null — never NaN
    const p = json.profile.price
    expect(p === null || (typeof p === 'number' && Number.isFinite(p))).toBe(true)
  })

  it('404s for a genuinely unknown ticker', async () => {
    const { status, json } = await assetGET('ZZZZNOPE')
    expect(status).toBe(404)
    expect(json.error).toBe('not_found')
  })
})
