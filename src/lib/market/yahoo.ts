/**
 * DEPRECATED — dead code (no importers anywhere in the app).
 *
 * Superseded by the unified market-data service used by /api/market/summary:
 *   - twelvedata.ts  (FX + commodities, with rate-limit handling)
 *   - stooq.ts       (indices + ASX stocks)
 *   - frankfurter.ts (FX fallback)
 *
 * Safe to delete: `git rm src/lib/market/yahoo.ts`
 * (Emptied here rather than deleted because the build sandbox blocked file
 *  removal; the original remains in git history.)
 */
export {}
