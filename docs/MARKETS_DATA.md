# Markets page — data architecture & verification

This document describes how the Fiscus **Markets** page (`/markets`) sources live
data, and exactly how to verify it is real after deploy.

## TL;DR

- The page calls one endpoint: **`GET /api/market/summary`** (Edge runtime).
- That endpoint composes three providers, each used only where it actually works
  on the **Twelve Data free tier** (forex, crypto, US equities, metals/oil — but
  **not** indices or ASX-listed equities, which need the paid Grow plan):

| Section          | Primary source        | Fallback        | Why |
|------------------|-----------------------|-----------------|-----|
| **FX** (AUD/USD, AUD/CNY, AUD/JPY, AUD/EUR) | **Twelve Data** `/quote` (real % change) | Frankfurter (ECB rate, no % change) | Forex works on TD free tier |
| **Commodities** (Gold, Silver, WTI Oil) | **Twelve Data** `/quote` (`XAU/USD`, `XAG/USD`, `WTI/USD`) | Stooq CSV | Metal/oil pairs work on TD free tier |
| **Indices** (ASX 200, S&P 500, Nikkei, FTSE 100) | **Stooq** CSV (`^axjo`,`^spx`,`^n225`,`^ftse`) | — | TD free tier can't serve indices |
| **ASX stocks** (CBA, BHP, CSL, NAB, WBC, WDS, RIO, ANZ, FMG, MQG) | **Stooq** CSV (`cba.au`, …) | — | TD free tier can't serve ASX equities |

Every value carries a `source` so the UI labels provenance honestly
(`Live · Twelve Data`, `Delayed · Stooq`, `Daily · ECB`). Nothing is mocked. If a
source fails, the value is `null` and the UI shows `—` / "unavailable", never a
fake or stale-as-live number.

> **Why not "everything via Twelve Data"?** Confirmed from Twelve Data docs and
> the repo's own git history (`debug: test all failing symbols (indices, stocks,
> commodities)`): the free Basic plan covers **forex, crypto, US equities** only.
> `AXJO`, `SPX`, `CBA:ASX`, etc. return per-symbol plan errors. Upgrading to the
> Grow plan ($29/mo) unlocks indices + international equities — see "Going all-in
> on Twelve Data" below.

## Endpoints & symbols used

- Twelve Data `GET https://api.twelvedata.com/quote?symbol=<csv>&apikey=…`
  - FX batch:          `AUD/USD,AUD/CNY,AUD/JPY,AUD/EUR`  (4 credits)
  - Commodities batch: `XAU/USD,XAG/USD,WTI/USD`          (3 credits)
- Twelve Data `GET /time_series?...&interval=1week&outputsize=52` — asset page charts
- Stooq `GET https://stooq.com/q/l/?s=<sym>&f=sd2t2ohlcv&h&e=csv` — indices + ASX stocks
- Frankfurter `GET https://api.frankfurter.app/latest?from=AUD&to=USD,CNY,JPY,EUR` — FX fallback

The API key is read **server-side only** (`process.env.TWELVE_DATA_API_KEY`) inside
the Edge route / lib. It is never sent to the browser — the client only receives a
`meta.tdKeyPresent` boolean.

## Rate-limit budget (free tier: 8 credits/min, 800/day)

- One uncached summary refresh = **7 Twelve Data credits** (4 FX + 3 commodities).
- The route sets `Cache-Control: s-maxage=300` → at most one upstream refresh per
  **5 minutes** regardless of how many users load the page. The page also
  auto-refreshes every 5 min and on manual refresh.
- Worst case with continuous traffic ≈ 7 credits × 12/hr ≈ 84/hr. Comfortably
  within 800/day for a small audience. Heavy traffic should move to the Grow plan.
- If the limit is hit, TD returns code `429`; the route reports
  `meta.tdRateLimited: true`, FX falls back to ECB rates, commodities fall back to
  Stooq, and the page shows an amber "rate-limited" notice. It never crashes.

## Before you push to Vercel

1. **Set the env var** (you said it's already on Vercel — confirm it's spelled
   exactly `TWELVE_DATA_API_KEY` and is present for the **Production** environment):
   Vercel → Project → Settings → Environment Variables.
2. Optionally add it to local `.env.local` to test `npm run dev` on your Mac
   (it is **not** in the repo `.env`/`.env.local` today).
3. `npm run build` on your Mac (the build couldn't run in the assistant's Linux
   sandbox because the mounted `node_modules` had macOS SWC binaries; `tsc --noEmit`
   passed there, which is the type-checking half of the build).
4. Consider deleting the now-empty dead libs:
   `git rm src/lib/market/yahoo.ts src/lib/market/asx.ts src/lib/market/fmp.ts`

## Live verification (run after deploy)

1. **Diagnostic endpoint** — open `https://<your-app>/api/market/debug`. It probes
   your actual key and prints, per symbol, `OK — <price>` or the exact error. Expect:
   - `AUD/USD`, `XAU/USD`, `XAG/USD`, `WTI/USD` → `OK — …` (free tier ✓)
   - `AXJO`, `SPX`, `CBA:ASX`, … → plan/permission errors (free tier ✗, expected)
   - `stooq` block → `OK — …` for ASX 200 / CBA / S&P 500
   - `frankfurter` → `OK` with AUD rates
2. **Summary endpoint** — open `https://<your-app>/api/market/summary` and check:
   - `fx[*].source === "twelvedata"` and `fx[*].change` is a real number (not null)
   - `commodities[*].source === "twelvedata"` (or `"stooq"` if TD rate-limited)
   - `indices[*].source === "stooq"`, `topMovers[*].source === "stooq"`
   - `meta.tdKeyPresent === true`, `meta.hasAnyLive === true`, `meta.tdRateLimited === false`
3. **Confirm it's real, not mocked** — cross-check one FX rate and Gold against
   Google / xe.com. Reload twice within 5 min: values are identical (edge-cached);
   after 5 min they move with the market. There are **no** hardcoded price constants
   anywhere in `src/lib/market` or the route (grep for digits — only the RBA policy
   rate is a labelled static reference, see below).
4. **Page** — open `/markets`: FX cards now show a % change chip; each section shows
   a provenance chip (`Live · Twelve Data` / `Delayed · Stooq`); the refresh button
   spins and updates the "Updated HH:MM" stamp.

## Stress scenarios (covered offline by `scripts/market-selftest.ts`)

`npx tsx scripts/market-selftest.ts` (on your Mac) exercises the normalizer against:
missing key, HTTP 429, body-level 429, valid batch, single-symbol shape, partial
(one OK + one plan-error), empty response, change-derived-from-prev-close, invalid
JSON, network throw, zero-price rejection, empty input. 16/16 assertions pass. None
throw — the page degrades gracefully in every case.

## The RBA cash rate box

The "RBA Rate" figure is a **policy** number, not market data, and has no free live
feed. It was hardcoded at a stale `4.10%`. It is now `4.35%` (effective 6 May 2026,
per rba.gov.au) and **labelled as a static reference with its effective date** so it
never masquerades as live. Update it (`RBA_RATE` in `markets/page.tsx`, and the
ticker tape) whenever the RBA changes the cash rate.

## Going all-in on Twelve Data (optional, needs Grow plan)

If you upgrade Twelve Data to Grow ($29/mo) or higher, indices and ASX equities
become available via TD. To switch those sections to TD, add their TD symbols
(`AXJO`, `SPX`, `NI225`, `UKX`, `CBA:ASX`, …) to a `fetchTwelveDataQuotes` batch in
`src/app/api/market/summary/route.ts` and prefer the TD quote over Stooq (same
pattern already used for FX/commodities). Verify each symbol first via `/api/market/debug`.

## Known limitations / risks

- **Stooq** is a free community CSV with no SLA; it can rate-limit or briefly 404.
  Indices/ASX-stock change % is computed intraday (close vs open), not vs prior
  close — directionally correct, labelled "Delayed".
- **Free-tier ceiling**: 800 TD credits/day. Fine for small traffic with the 5-min
  cache; scale → Grow plan.
- Live data could not be verified inside the assistant's sandbox (no outbound
  network to market APIs, and macOS `node_modules` binaries). All verification above
  must be run on your Mac or on Vercel.
