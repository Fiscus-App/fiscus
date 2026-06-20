/**
 * Frankfurter API — ECB reference exchange rates.
 * No API key required. Always available from any server (incl. Vercel).
 * Rates are published on ECB business days (typically 4pm CET).
 * Latency: typically same-day, never more than 1 business day old.
 * https://www.frankfurter.app/docs
 */

export interface FrankfurterRates {
  base: string
  date: string   // ISO date of last rate update, e.g. "2026-06-10"
  rates: Partial<Record<string, number>>
}

export async function fetchAUDRates(): Promise<FrankfurterRates | null> {
  try {
    const res = await fetch(
      'https://api.frankfurter.app/latest?from=AUD&to=USD,CNY,JPY,EUR',
      {
        next: { revalidate: 3600 },  // Vercel edge cache: reuse for 1 hour
        signal: AbortSignal.timeout(5000),
      }
    )
    if (!res.ok) return null
    return (await res.json()) as FrankfurterRates
  } catch (err) {
    console.error('[Frankfurter] fetch failed:', err)
    return null
  }
}

// ─── FX with daily % change ───────────────────────────────────────────────────
// Twelve Data's free tier (8 credits/min) is reserved for ETFs/commodities, so
// AUD FX comes from Frankfurter — free, unlimited, and reachable from Vercel.
// We pull a short timeseries and compute % change from the two most recent
// published ECB rates. Falls back to latest-only (no change) if that fails.

export interface FxQuote { rate: number; changePct: number | null }

const FX_CURRENCIES = ['USD', 'CNY', 'JPY', 'EUR'] as const

export async function fetchAUDFx(): Promise<Record<string, FxQuote>> {
  const out: Record<string, FxQuote> = {}

  try {
    const start = new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString().slice(0, 10)
    const res = await fetch(
      `https://api.frankfurter.app/${start}..?from=AUD&to=${FX_CURRENCIES.join(',')}`,
      { next: { revalidate: 3600 }, signal: AbortSignal.timeout(6000) }
    )
    if (res.ok) {
      const json = await res.json() as { rates?: Record<string, Record<string, number>> }
      const dates = Object.keys(json.rates ?? {}).sort() // ascending by date
      if (dates.length >= 1) {
        const last = json.rates![dates[dates.length - 1]] ?? {}
        const prev = dates.length >= 2 ? (json.rates![dates[dates.length - 2]] ?? {}) : {}
        for (const cur of FX_CURRENCIES) {
          const rate = last[cur]
          if (typeof rate === 'number') {
            const p = prev[cur]
            const changePct = typeof p === 'number' && p !== 0 ? ((rate - p) / p) * 100 : null
            out[cur] = { rate, changePct }
          }
        }
        if (Object.keys(out).length > 0) return out
      }
    }
  } catch {
    // fall through to latest-only
  }

  const latest = await fetchAUDRates()
  if (latest?.rates) {
    for (const cur of FX_CURRENCIES) {
      const rate = latest.rates[cur]
      if (typeof rate === 'number') out[cur] = { rate, changePct: null }
    }
  }
  return out
}
