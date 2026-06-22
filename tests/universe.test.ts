import { describe, it, expect } from 'vitest'
import { ASSET_UNIVERSE, ASSET_ALIASES, getAsset } from '@/lib/market/universe'

describe('asset universe integrity', () => {
  it('contains a substantial number of assets', () => {
    expect(ASSET_UNIVERSE.length).toBeGreaterThan(700)
  })

  it('has unique tickers', () => {
    const seen = new Set<string>()
    const dupes: string[] = []
    for (const a of ASSET_UNIVERSE) {
      const t = a.ticker.toUpperCase()
      if (seen.has(t)) dupes.push(t)
      seen.add(t)
    }
    expect(dupes).toEqual([])
  })

  it('every asset has all required fields populated', () => {
    for (const a of ASSET_UNIVERSE) {
      expect(a.ticker, JSON.stringify(a)).toBeTruthy()
      expect(a.name, a.ticker).toBeTruthy()
      expect(a.exchange, a.ticker).toBeTruthy()
      expect(a.sector, a.ticker).toBeTruthy()
      expect(a.sectorColor).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(a.currency, a.ticker).toBeTruthy()
      expect(['STOCK', 'ETF', 'INDEX', 'COMMODITY', 'FX', 'CRYPTO']).toContain(a.type)
    }
  })

  it('every alias resolves to a real ticker', () => {
    for (const [alias, ticker] of Object.entries(ASSET_ALIASES)) {
      expect(getAsset(ticker), `alias "${alias}" → ${ticker}`).toBeTruthy()
    }
  })

  it('covers each required asset class', () => {
    const byType = (t: string) => ASSET_UNIVERSE.filter(a => a.type === t).length
    expect(byType('STOCK')).toBeGreaterThan(500)   // S&P 500 + ASX + extras
    expect(byType('ETF')).toBeGreaterThan(20)
    expect(byType('INDEX')).toBeGreaterThan(8)
    expect(byType('COMMODITY')).toBeGreaterThan(5)
    expect(byType('FX')).toBeGreaterThan(8)
    expect(byType('CRYPTO')).toBeGreaterThan(10)
  })

  it('includes the major ASX banks and miners', () => {
    for (const t of ['CBA', 'NAB', 'WBC', 'ANZ', 'BHP', 'RIO', 'FMG', 'CSL', 'WDS']) {
      const a = getAsset(t)
      expect(a, t).toBeTruthy()
      expect(a!.exchange).toBe('ASX')
    }
  })

  it('maps live-data symbols correctly for tradable classes', () => {
    // US equities, ETFs, FX, crypto and commodities carry a Twelve Data symbol.
    expect(getAsset('AAPL')!.tdSymbol).toBe('AAPL')
    expect(getAsset('BTC')!.tdSymbol).toBe('BTC/USD')
    expect(getAsset('GOLD')!.tdSymbol).toBe('XAU/USD')
    expect(getAsset('AUDUSD')!.tdSymbol).toBe('AUD/USD')
    // ASX equities have no free-tier symbol (sourced from Stooq at runtime).
    expect(getAsset('CBA')!.tdSymbol).toBeNull()
  })

  it('getAsset is case-insensitive and URL-safe', () => {
    expect(getAsset('aapl')!.ticker).toBe('AAPL')
    expect(getAsset('BTC')!.ticker).toBe('BTC')
    expect(getAsset('not-real')).toBeUndefined()
  })
})
