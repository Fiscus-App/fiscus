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
