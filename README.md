# Fiscus — Australian Financial Intelligence Platform

> Bloomberg speed. Professional trust.

Fiscus turns ASX announcements, RBA decisions, and market data into sharp 15-second AI briefings — built for analysts, consultants, and investors.

---

## What It Does

- **Vertical video feed** — TikTok-style scroll through financial briefings, each backed by a verified source
- **AI briefing engine** — Claude generates professional 15-second scripts from ingested articles (streaming, typewriter reveal)
- **Video generation pipeline** — Remotion + ElevenLabs renders voiced, captioned video briefings
- **Trust layer** — every card shows source name, credibility tier, original URL, timestamp, and "not financial advice" disclaimer
- **Market dashboard** — live ASX 200, indices, sectors, commodities, AUD/FX, RBA cash rate
- **Team workspaces** — share briefings to team chat, discuss, pin, folder
- **Personalised feed** — interest selection drives recommendation algorithm
- **Admin dashboard** — ingestion job queue, source management, AI generation queue

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 App Router + TypeScript + Tailwind CSS |
| Database | PostgreSQL via Supabase + Prisma ORM |
| AI | Anthropic Claude (script gen, summarisation, streaming) |
| Auth | NextAuth.js |
| Charts | Recharts |
| Video rendering | Remotion + AWS Lambda *(pluggable)* |
| Text-to-speech | ElevenLabs *(pluggable)* |
| Background jobs | Inngest *(pluggable)* |
| Storage | Supabase Storage |
| Ingestion | RSS Parser + ASX API + custom adapters |

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/fiscus.git
cd fiscus
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in at minimum:
- `DATABASE_URL` — PostgreSQL connection string (Supabase recommended)
- `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com)
- `NEXTAUTH_SECRET` — run `openssl rand -base64 32`

### 3. Set up the database

```bash
# Push schema to your database
npm run db:push

# Generate Prisma client
npm run db:generate

# Seed with demo data and sources
npm run db:seed
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Demo credentials:** `demo@fiscus.io` / `fiscus2025`

---

## Project Structure

```
fiscus/
├── prisma/
│   ├── schema.prisma          # Full data model (20 tables)
│   └── seed.ts                # Demo data + source configuration
├── src/
│   ├── app/
│   │   ├── (app)/             # Authenticated app routes
│   │   │   ├── feed/          # Vertical video feed
│   │   │   ├── markets/       # ASX dashboard
│   │   │   ├── saved/         # Saved briefings
│   │   │   └── teams/         # Team workspaces
│   │   ├── (auth)/            # Login / signup
│   │   ├── admin/             # Ingestion + source management
│   │   └── api/
│   │       ├── feed/          # Feed pagination API
│   │       ├── articles/
│   │       │   └── generate-script/  # Streaming AI script endpoint
│   │       ├── videos/generate/      # Video generation trigger
│   │       ├── ingestion/trigger/    # Manual ingestion trigger
│   │       └── teams/[teamId]/messages/
│   ├── components/
│   │   ├── feed/
│   │   │   ├── VideoCard.tsx         # Core feed unit with AI + video
│   │   │   └── SourceBadge.tsx       # Credibility tier badge
│   │   ├── markets/
│   │   │   └── TickerTape.tsx        # Live market tape
│   │   └── layout/
│   │       └── Header + BottomNav
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── scriptgen.ts   # Claude streaming script generator
│   │   │   ├── summarise.ts   # Article summarisation + classification
│   │   │   └── prompts.ts     # All AI prompt templates
│   │   ├── ingestion/
│   │   │   └── pipeline.ts    # RSS + ASX + RBA + ABS adapters
│   │   └── db.ts              # Prisma client singleton
│   └── types/
│       └── index.ts           # All TypeScript types
└── .env.example               # All required environment variables
```

---

## Source Credibility Tiers

| Tier | Sources | Badge Colour |
|---|---|---|
| **Official** | ASX, RBA, ABS, company investor relations | Green |
| **Tier 1 Media** | AFR, Bloomberg, Reuters, Morningstar | Blue |
| **Market Data** | Alpha Vantage, Polygon, Yahoo Finance | Gold |
| **Other** | Unverified / use caution | Orange |

---

## AI Briefing Format

Every script follows this 80–100 word structure:

```
[HOOK — 2s]         Most critical number or fact. No preamble.
[CORE UPDATE — 8s]  Precise data-driven explanation.
[WHY IT MATTERS — 4s] Commercial implication for professionals.
[SOURCE]            "Source: [source name]."
```

Scripts are generated via `claude-sonnet-4-20250514` with streaming enabled for real-time typewriter reveal in the UI.

---

## Plugging In Real APIs

| Feature | Where to configure |
|---|---|
| Market data (live prices) | `src/lib/market/` — implement Alpha Vantage or Polygon adapters |
| Video rendering | Set `ENABLE_VIDEO_RENDERING=true` + configure Remotion Lambda |
| Text-to-speech | Set `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` |
| Background ingestion jobs | Replace `setTimeout` in ingestion route with Inngest functions |
| Licensed feeds (AFR/Bloomberg) | Update RSS URLs in `prisma/seed.ts` with licensed endpoints |

---

## Ethical Ingestion Policy

- Respects `robots.txt` on all scrapers
- Stores source URL on every article — never orphaned content
- Does not bypass paywalls
- Prefers official APIs and licensed feeds over scraping
- Summarises rather than reproduces (no verbatim reproduction)
- All summaries link back to original source
- Clear "not financial advice" disclaimer on every briefing

---

## Deploying

### Vercel (recommended)

```bash
vercel deploy
```

Set all `.env.example` variables in Vercel dashboard. Enable Edge Runtime for the streaming script endpoint.

### Self-hosted

```bash
npm run build
npm start
```

---

## License

MIT — built by [Your Name]. Not affiliated with ASX, RBA, ABS, AFR, Bloomberg, or Morningstar.

**Fiscus briefings are informational only and do not constitute financial advice.**
