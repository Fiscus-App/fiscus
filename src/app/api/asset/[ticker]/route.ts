import { NextRequest, NextResponse } from 'next/server'
import { db, dbAvailable } from '@/lib/db'
import { fetchSingleQuote, fetchTimeSeries } from '@/lib/market/twelvedata'
import { fetchStooqQuotesByTicker } from '@/lib/market/stooq'
import { getAsset, type UniverseAsset } from '@/lib/market/universe'

export const dynamic = 'force-dynamic'

// ── Curated extras: rich descriptions, IR links and reference fundamentals for
// the best-known assets. Price/change/volume/52w are taken LIVE where a data
// source exists; these reference values are only used as a labelled fallback
// (page shows no LIVE badge when data isn't live). Nothing fabricated is ever
// presented as a live quote.
interface CuratedExtra {
  description: string
  links?: { label: string; url: string }[]
  marketCap?: string
  peRatio?: number
  dividend?: number
  high52w?: number
  low52w?: number
}

const CURATED: Record<string, CuratedExtra> = {
  CBA: {
    description: 'Commonwealth Bank is Australia’s largest bank by market capitalisation, providing retail, business, and institutional banking services. Known for its dominant retail franchise, digital banking leadership, and consistently strong return on equity. CBA operates CommSec, one of Australia’s largest online broking platforms.',
    links: [{ label: 'Investor Relations', url: 'https://www.commbank.com.au/investors' }],
    marketCap: '$284B', peRatio: 24.1, dividend: 3.2, high52w: 168.50, low52w: 112.30,
  },
  NAB: {
    description: 'National Australia Bank is one of Australia’s Big Four banks, with a focus on business banking where it holds the #1 position. NAB has significant operations in New Zealand through Bank of New Zealand (BNZ), and has been focusing on its SME and corporate banking strengths.',
    links: [{ label: 'Investor Relations', url: 'https://www.nab.com.au/about-us/shareholder-centre' }],
    marketCap: '$92B', peRatio: 16.8, dividend: 4.8, high52w: 40.20, low52w: 28.50,
  },
  WBC: {
    description: 'Westpac is Australia’s oldest bank, founded in 1817, and one of the Big Four. It operates across consumer, business, and institutional banking with a strong presence in New Zealand. The bank is executing a multi-year transformation program aimed at simplifying its operations and technology stack.',
    marketCap: '$74B', peRatio: 15.2, dividend: 5.1, high52w: 34.10, low52w: 22.80,
  },
  ANZ: {
    description: 'ANZ Group is one of Australia’s Big Four banks with the most significant international footprint, particularly across Asia Pacific. ANZ acquired Suncorp Bank in 2024, strengthening its retail position in Queensland.',
    marketCap: '$68B', peRatio: 13.9, dividend: 5.4, high52w: 32.50, low52w: 22.10,
  },
  MQG: {
    description: 'Macquarie Group is a global financial services firm headquartered in Sydney, known as the “millionaires’ factory.” It specialises in infrastructure, energy, commodities and financial assets. Macquarie Asset Management is one of the world’s largest infrastructure managers.',
    marketCap: '$72B', peRatio: 21.3, dividend: 2.8, high52w: 238.00, low52w: 158.20,
  },
  BHP: {
    description: 'BHP is the world’s largest mining company by market cap, producing iron ore, copper, coal, and nickel across Australia, the Americas, and beyond. Its Pilbara iron ore operations ship over 250Mt per year. BHP is strategically expanding into copper for the energy transition.',
    links: [{ label: 'Investor Relations', url: 'https://www.bhp.com/investors' }],
    marketCap: '$225B', peRatio: 14.2, dividend: 5.8, high52w: 52.10, low52w: 38.40,
  },
  RIO: {
    description: 'Rio Tinto is a leading global mining and metals company producing iron ore, aluminium, copper, and minerals. Its Pilbara iron ore business is among the lowest-cost producers in the world. Rio is investing heavily in lithium through its Rincon and Jadar projects.',
    marketCap: '$185B', peRatio: 10.8, dividend: 6.4, high52w: 138.20, low52w: 102.50,
  },
  FMG: {
    description: 'Fortescue is Australia’s third-largest iron ore producer, founded by Andrew Forrest. The company ships from the Pilbara region and has ambitious green energy targets through Fortescue Energy, aiming to produce green hydrogen and decarbonise its operations.',
    marketCap: '$68B', peRatio: 9.4, dividend: 8.2, high52w: 29.80, low52w: 17.20,
  },
  WDS: {
    description: 'Woodside Energy is Australia’s largest oil and gas producer, with major LNG projects including the North West Shelf and Pluto in Western Australia. Following its 2022 merger with BHP Petroleum, Woodside has a growing global portfolio.',
    marketCap: '$46B', peRatio: 12.1, dividend: 7.2, high52w: 31.40, low52w: 19.80,
  },
  CSL: {
    description: 'CSL is a global biotechnology company and one of the largest companies in Australia, specialising in plasma-derived therapies, vaccines, and recombinant products. Its brands include CSL Behring, Seqirus (flu vaccines), and CSL Vifor.',
    marketCap: '$142B', peRatio: 38.4, dividend: 1.4, high52w: 328.00, low52w: 242.10,
  },
  WES: {
    description: 'Wesfarmers is one of Australia’s largest companies, operating Bunnings (hardware), Kmart, Target, Officeworks, and a Chemicals, Energy and Fertilisers division. The conglomerate model gives it earnings diversification, and it has pivoted toward lithium mining via Mt Holland.',
    marketCap: '$93B', peRatio: 32.8, dividend: 2.8, high52w: 86.40, low52w: 58.20,
  },
  WOW: {
    description: 'Woolworths is Australia’s largest supermarket chain with over 1,000 stores, operating Woolworths Supermarkets, Big W, and BWS. The company has faced scrutiny over grocery pricing amid cost-of-living pressures and is investing in supply chain automation and its Everyday Rewards loyalty ecosystem.',
    marketCap: '$36B', peRatio: 22.1, dividend: 3.8, high52w: 38.80, low52w: 28.40,
  },
  TLS: {
    description: 'Telstra is Australia’s largest telecommunications company, operating the country’s largest 4G and 5G networks. Following its T22 restructure, Telstra separated its infrastructure (InfraCo) and services. The InfraCo towers business is independently valued.',
    marketCap: '$50B', peRatio: 28.4, dividend: 4.4, high52w: 4.48, low52w: 3.52,
  },
  GMG: {
    description: 'Goodman Group is the world’s largest listed industrial property group, specialising in logistics and data centre properties globally. It has benefited enormously from AI data centre demand — a large share of its development pipeline is now data centres.',
    marketCap: '$73B', peRatio: 44.2, dividend: 0.8, high52w: 40.80, low52w: 24.20,
  },
  XRO: {
    description: 'Xero is a New Zealand-founded cloud accounting software company listed on the ASX, serving millions of subscribers globally. It dominates the Australian and NZ small business accounting market and is growing in the UK and North America, leveraging AI to automate bookkeeping.',
    marketCap: '$28B', peRatio: 88.2, dividend: 0, high52w: 198.20, low52w: 104.40,
  },
  PLS: {
    description: 'Pilbara Minerals operates the Pilgangoora lithium-tantalum project in Western Australia, one of the world’s largest hard-rock lithium deposits. PLS sells spodumene concentrate to lithium chemical converters in Asia. Its fortunes are closely tied to lithium prices.',
    marketCap: '$8.5B', peRatio: 18.4, dividend: 2.2, high52w: 4.82, low52w: 2.44,
  },
  AAPL: {
    description: 'Apple is one of the world’s most valuable companies, known for the iPhone, Mac, iPad, Apple Watch, and services including the App Store, Apple Music, and iCloud. Services revenue exceeds $100B annually. Apple Intelligence is positioned as a key driver for the next iPhone upgrade cycle.',
    marketCap: '$3.5T', peRatio: 36.2, dividend: 0.44, high52w: 260.10, low52w: 164.08,
  },
  NVDA: {
    description: 'NVIDIA designs GPUs and AI computing platforms that have become the dominant infrastructure for training and running AI models. Its data centre GPUs are sold at premiums with multi-quarter backlogs. NVIDIA now derives the majority of revenue from its Data Center segment.',
    marketCap: '$3.5T', peRatio: 54.8, dividend: 0.03, high52w: 195.00, low52w: 86.62,
  },
  MSFT: {
    description: 'Microsoft is a global technology leader operating across cloud (Azure), productivity software (Microsoft 365, Teams), gaming (Xbox, Activision Blizzard), and AI via its partnership with OpenAI. Microsoft Copilot is being embedded across its entire product suite.',
    marketCap: '$3.3T', peRatio: 38.4, dividend: 0.75, high52w: 468.35, low52w: 385.58,
  },
  TSLA: {
    description: 'Tesla is the world’s leading electric vehicle manufacturer, also operating energy storage and solar businesses. It faces growing competition from Chinese EV makers. Tesla’s Full Self-Driving and Robotaxi plans are central to its long-term valuation thesis.',
    marketCap: '$800B', peRatio: 82.4, dividend: 0, high52w: 488.54, low52w: 138.80,
  },
  GOOGL: {
    description: 'Alphabet is Google’s parent company, operating the world’s dominant search engine, YouTube, Google Cloud, and the Waymo autonomous vehicle unit. Google Cloud is the fastest-growing of its segments, gaining share in AI infrastructure.',
    marketCap: '$2.3T', peRatio: 24.8, dividend: 0.20, high52w: 208.70, low52w: 148.07,
  },
  META: {
    description: 'Meta operates Facebook, Instagram, WhatsApp, and Threads, reaching billions of daily active users across its Family of Apps. Meta AI is being integrated across all its platforms, and Llama is its open-source large language model.',
    marketCap: '$1.6T', peRatio: 28.4, dividend: 0.50, high52w: 740.91, low52w: 414.50,
  },
  AMZN: {
    description: 'Amazon is the world’s largest e-commerce company and the leader in cloud computing through AWS. AWS accounts for the majority of Amazon’s operating profit. Amazon is also a major player in digital advertising, leveraging its shopper intent data.',
    marketCap: '$2.4T', peRatio: 44.8, dividend: 0, high52w: 242.52, low52w: 151.61,
  },
  GOLD: {
    description: 'Gold is the world’s oldest store of value, priced in USD per troy ounce. It is historically used as a safe haven against inflation, currency devaluation, and geopolitical risk. Central banks have been net buyers for several consecutive years. Real bond yields are the primary driver of gold prices.',
  },
  OIL: {
    description: 'West Texas Intermediate (WTI) is the benchmark crude oil price for North American production. Oil prices are influenced by OPEC+ production decisions, US shale output, global demand, and geopolitical risk.',
  },
  AUDUSD: {
    description: 'The AUD/USD exchange rate reflects Australia’s economic relationship with the US and global risk sentiment. The Australian dollar is a commodity currency — it rises with iron ore and coal prices and falls during risk-off markets. RBA policy relative to the US Fed is the primary macro driver.',
  },
  XJO: {
    description: 'The S&P/ASX 200 is Australia’s primary equity index, tracking the 200 largest companies listed on the ASX by float-adjusted market capitalisation. It is heavily weighted toward financials and materials, and is the benchmark for Australian superannuation funds and ETFs.',
  },
  SPX: {
    description: 'The S&P 500 is the primary benchmark for the US equity market, tracking 500 large-cap companies across 11 sectors. A handful of mega-cap technology stocks account for a large share of the index, creating concentration risk. It is the most widely tracked index in the world.',
  },
}

function fmtVolume(v?: number): string | undefined {
  if (!v || !Number.isFinite(v)) return undefined
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B'
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M'
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K'
  return String(Math.round(v))
}

function defaultDescription(a: UniverseAsset): string {
  switch (a.type) {
    case 'ETF':       return `${a.name} is an exchange-traded fund listed on ${a.exchange}. Live pricing and recent related coverage are shown where available.`
    case 'INDEX':     return `${a.name} is a major equity index. Index levels require licensed market data on the free tier; related news coverage is shown where available.`
    case 'COMMODITY': return `${a.name} is a globally traded commodity, priced in USD. Spot pricing is sourced live where available.`
    case 'FX':        return `${a.name} is a foreign-exchange pair. Live rates are sourced where available.`
    case 'CRYPTO':    return `${a.name} is a cryptocurrency, priced in USD. Live pricing is sourced where available.`
    default:          return `${a.name} is listed on ${a.exchange}. Live pricing and recent related coverage are shown where available.`
  }
}

const CACHE_HEADERS = { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60' }

export async function GET(
  req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = decodeURIComponent(params.ticker).toUpperCase()
  const asset  = getAsset(ticker)

  // ── Unknown ticker: try a live US-equity quote before giving up. ──────────
  if (!asset) {
    const q = await fetchSingleQuote(ticker, ticker).catch(() => null)
    if (!q) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    const ts = await fetchTimeSeries(ticker).catch(() => [] as number[])
    return NextResponse.json({
      profile: {
        ticker, name: q.name ?? ticker, exchange: 'US', sector: 'Equities',
        sectorColor: '#5b8af5', type: 'STOCK', currency: 'USD',
        price: q.price, change: q.change, changeAbs: q.changeAbs,
        high52w: q.high52w ?? null, low52w: q.low52w ?? null, volume: fmtVolume(q.volume),
        description: `Live market data for ${ticker}.`, isLive: true,
      },
      chart: ts, chartIsReal: ts.length > 0, articles: [],
    }, { headers: CACHE_HEADERS })
  }

  const curated = CURATED[ticker]

  // ── Live price + chart ─────────────────────────────────────────────────────
  let live: { price: number; change: number; changeAbs: number; volume?: number; high52w?: number; low52w?: number } | null = null
  let chart: number[] = []

  if (asset.tdSymbol) {
    const [q, ts] = await Promise.all([
      fetchSingleQuote(asset.tdSymbol, ticker).catch(() => null),
      fetchTimeSeries(asset.tdSymbol).catch(() => [] as number[]),
    ])
    if (q) live = { price: q.price, change: q.change, changeAbs: q.changeAbs, volume: q.volume, high52w: q.high52w, low52w: q.low52w }
    chart = ts
  } else if (asset.exchange === 'ASX') {
    // ASX equities: no free Twelve Data symbol — best-effort Stooq (may be
    // IP-blocked from some hosts; degrades to "pricing unavailable").
    const m = await fetchStooqQuotesByTicker([ticker]).catch(() => new Map())
    const q = m.get(ticker)
    if (q) live = { price: q.price, change: q.change, changeAbs: q.changeAbs }
  }

  const high52w = live?.high52w ?? curated?.high52w ?? null
  const low52w  = live?.low52w  ?? curated?.low52w  ?? null

  const profile = {
    ticker:      asset.ticker,
    name:        asset.name,
    exchange:    asset.exchange,
    sector:      asset.sector,
    sectorColor: asset.sectorColor,
    type:        asset.type,
    currency:    asset.currency,
    unit:        asset.unit ?? null,
    price:       live ? live.price : null,
    change:      live ? live.change : null,
    changeAbs:   live ? live.changeAbs : null,
    high52w,
    low52w,
    volume:      fmtVolume(live?.volume) ?? undefined,
    marketCap:   curated?.marketCap,
    peRatio:     curated?.peRatio,
    dividend:    curated?.dividend,
    description: curated?.description ?? defaultDescription(asset),
    links:       curated?.links,
    isLive:      Boolean(live),
  }

  // ── Related articles (DB, best-effort) ─────────────────────────────────────
  let articles: {
    id: string
    title: string
    summary: string | null
    publishedAt: Date
    source: { name: string }
    sector: string | null
  }[] = []

  if (dbAvailable) {
    try {
      articles = await db.article.findMany({
        where: {
          summary: { not: null, notIn: ['__REJECTED__'] },
          OR: [
            { relatedTickers: { has: ticker } },
            { sector: asset.sector },
            { title: { contains: asset.name.split(' ')[0], mode: 'insensitive' } },
          ],
        },
        select: {
          id: true, title: true, summary: true,
          publishedAt: true, sector: true,
          source: { select: { name: true } },
        },
        orderBy: { publishedAt: 'desc' },
        take: 6,
      })
    } catch { /* ignore */ }
  }

  return NextResponse.json({
    profile,
    chart,
    chartIsReal: chart.length > 0,
    articles: articles.map(a => ({
      id: a.id, title: a.title, summary: a.summary,
      publishedAt: a.publishedAt, source: a.source.name, sector: a.sector,
    })),
  }, { headers: CACHE_HEADERS })
}
