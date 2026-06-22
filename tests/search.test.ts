import { describe, it, expect } from 'vitest'
import { searchAssets, BROWSE_CATEGORIES } from '@/lib/market/search'
import { getAsset } from '@/lib/market/universe'

// The exact terms the production-readiness brief requires to work.
const REQUIRED: { query: string; ticker: string }[] = [
  { query: 'AAPL', ticker: 'AAPL' },
  { query: 'Apple', ticker: 'AAPL' },
  { query: 'MSFT', ticker: 'MSFT' },
  { query: 'Tesla', ticker: 'TSLA' },
  { query: 'Nvidia', ticker: 'NVDA' },
  { query: 'CBA', ticker: 'CBA' },
  { query: 'Commonwealth Bank', ticker: 'CBA' },
  { query: 'BHP', ticker: 'BHP' },
  { query: 'CSL', ticker: 'CSL' },
  { query: 'Xero', ticker: 'XRO' },
  { query: 'SPY', ticker: 'SPY' },
  { query: 'QQQ', ticker: 'QQQ' },
  { query: 'IVV', ticker: 'IVV' },
  { query: 'VAS', ticker: 'VAS' },
  { query: 'BTC', ticker: 'BTC' },
  { query: 'AUD/USD', ticker: 'AUDUSD' },
  { query: 'Gold', ticker: 'GOLD' },
  { query: 'Oil', ticker: 'OIL' },
  { query: 'S&P 500', ticker: 'SPX' },
  { query: 'NASDAQ 100', ticker: 'NDX' },
]

describe('searchAssets — required brief terms', () => {
  for (const { query, ticker } of REQUIRED) {
    it(`"${query}" → top result is ${ticker}`, () => {
      const results = searchAssets(query, 10)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].ticker).toBe(ticker)
    })
  }
})

describe('searchAssets — behaviour', () => {
  it('is case-insensitive', () => {
    expect(searchAssets('aapl')[0].ticker).toBe('AAPL')
    expect(searchAssets('AaPl')[0].ticker).toBe('AAPL')
  })

  it('supports partial / prefix ticker matches', () => {
    const r = searchAssets('AAP')
    expect(r.some(a => a.ticker === 'AAPL')).toBe(true)
  })

  it('supports partial company-name matches', () => {
    const r = searchAssets('common')
    expect(r.some(a => a.ticker === 'CBA')).toBe(true)
  })

  it('ranks exact ticker above name-substring matches', () => {
    // "V" is Visa's exact ticker; it must outrank the many names containing "v".
    expect(searchAssets('V')[0].ticker).toBe('V')
  })

  it('ignores forex slash formatting', () => {
    expect(searchAssets('audusd')[0].ticker).toBe('AUDUSD')
    expect(searchAssets('AUD/USD')[0].ticker).toBe('AUDUSD')
  })

  it('returns an empty array for blank / junk queries', () => {
    expect(searchAssets('')).toEqual([])
    expect(searchAssets('   ')).toEqual([])
    expect(searchAssets('zzzzzzzznotathing')).toEqual([])
  })

  it('respects the limit argument', () => {
    expect(searchAssets('a', 5).length).toBeLessThanOrEqual(5)
  })
})

describe('browse categories', () => {
  it('every browse ticker resolves to a real universe asset', () => {
    for (const cat of BROWSE_CATEGORIES) {
      for (const t of cat.tickers) {
        expect(getAsset(t), `${t} in ${cat.id}`).toBeTruthy()
      }
    }
  })
})
