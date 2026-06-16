import { NextRequest, NextResponse } from 'next/server'
import { db, dbAvailable } from '@/lib/db'
import { fetchQuotes, fetchHistoricalChart, toYahooSymbol } from '@/lib/market/yahoo'

// ── Asset profile catalogue ───────────────────────────────────────────────────

type AssetType = 'STOCK' | 'COMMODITY' | 'INDEX' | 'FX' | 'MONETARY_POLICY'

interface AssetProfile {
  ticker:      string
  name:        string
  exchange?:   string
  sector:      string
  sectorColor: string
  type:        AssetType
  price:       number
  change:      number       // % change today
  changeAbs:   number       // $ change today
  currency:    string
  marketCap?:  string
  volume?:     string
  high52w:     number
  low52w:      number
  peRatio?:    number
  dividend?:   number       // yield %
  description: string
  links?:      { label: string; url: string }[]
}

// Deterministic fallback chart — used only when Yahoo returns nothing
function ghostChart(basePrice: number, volatility = 0.015, trend = 0.08): number[] {
  const points: number[] = []
  let price = basePrice * (1 - trend * 0.9)
  for (let i = 0; i < 52; i++) {
    const drift = (trend / 52) + (Math.random() - 0.48) * volatility * price
    price = Math.max(price + drift, price * 0.9)
    points.push(Math.round(price * 100) / 100)
  }
  points[51] = basePrice
  return points
}

// Map our ticker to a Yahoo Finance symbol
function assetToYahoo(ticker: string, type: AssetType): string | null {
  const overrides: Record<string, string> = {
    GOLD:  'GC=F',
    OIL:   'CL=F',
    SILVER:'SI=F',
    AUD:   'AUDUSD=X',
    XJO:   '^AXJO',
    SPX:   '^GSPC',
    NDX:   '^IXIC',
    DJI:   '^DJI',
    RBA:   null as unknown as string,
  }
  if (ticker in overrides) return overrides[ticker]
  if (type === 'STOCK') return toYahooSymbol(ticker) // adds .AX for ASX
  return null
}

const PROFILES: Record<string, AssetProfile> = {
  // ── ASX Banks ───────────────────────────────────────────────────────────────
  CBA: {
    ticker: 'CBA', name: 'Commonwealth Bank of Australia', exchange: 'ASX',
    sector: 'Banking', sectorColor: '#5b8af5', type: 'STOCK',
    price: 162.40, change: 1.82, changeAbs: 2.91, currency: 'AUD',
    marketCap: '$284B', volume: '3.2M', high52w: 168.50, low52w: 112.30,
    peRatio: 24.1, dividend: 3.2,
    description: 'Commonwealth Bank is Australia\'s largest bank by market capitalisation, providing retail, business, and institutional banking services. Known for its dominant retail franchise, digital banking leadership, and consistently strong return on equity above 14%. CBA operates CommSec, one of Australia\'s largest online broking platforms.',
    links: [{ label: 'Investor Relations', url: 'https://www.commbank.com.au/investors' }],
  },
  NAB: {
    ticker: 'NAB', name: 'National Australia Bank', exchange: 'ASX',
    sector: 'Banking', sectorColor: '#5b8af5', type: 'STOCK',
    price: 38.42, change: 0.62, changeAbs: 0.24, currency: 'AUD',
    marketCap: '$92B', volume: '8.1M', high52w: 40.20, low52w: 28.50,
    peRatio: 16.8, dividend: 4.8,
    description: 'National Australia Bank is one of Australia\'s Big Four banks, with a focus on business banking where it holds the #1 position. NAB has significant operations in New Zealand through Bank of New Zealand (BNZ), and has been strategically exiting non-core businesses to focus on its SME and corporate banking strengths.',
    links: [{ label: 'Investor Relations', url: 'https://www.nab.com.au/about-us/shareholder-centre' }],
  },
  WBC: {
    ticker: 'WBC', name: 'Westpac Banking Corporation', exchange: 'ASX',
    sector: 'Banking', sectorColor: '#5b8af5', type: 'STOCK',
    price: 32.18, change: -0.38, changeAbs: -0.12, currency: 'AUD',
    marketCap: '$74B', volume: '9.4M', high52w: 34.10, low52w: 22.80,
    peRatio: 15.2, dividend: 5.1,
    description: 'Westpac is Australia\'s oldest bank, founded in 1817, and one of the Big Four. It operates across consumer, business, and institutional banking with a strong presence in New Zealand through Westpac NZ. The bank is executing a multi-year transformation program aimed at simplifying its operations and technology stack.',
  },
  ANZ: {
    ticker: 'ANZ', name: 'ANZ Group Holdings', exchange: 'ASX',
    sector: 'Banking', sectorColor: '#5b8af5', type: 'STOCK',
    price: 30.84, change: 0.29, changeAbs: 0.09, currency: 'AUD',
    marketCap: '$68B', volume: '7.8M', high52w: 32.50, low52w: 22.10,
    peRatio: 13.9, dividend: 5.4,
    description: 'ANZ Group is one of Australia\'s Big Four banks with the most significant international footprint, particularly across Asia Pacific. ANZ acquired Suncorp Bank in 2024, strengthening its retail position in Queensland. The bank has a large institutional banking division serving corporate clients across 33 markets.',
  },
  MQG: {
    ticker: 'MQG', name: 'Macquarie Group', exchange: 'ASX',
    sector: 'Finance', sectorColor: '#e8b84b', type: 'STOCK',
    price: 224.60, change: 1.44, changeAbs: 3.20, currency: 'AUD',
    marketCap: '$72B', volume: '1.1M', high52w: 238.00, low52w: 158.20,
    peRatio: 21.3, dividend: 2.8,
    description: 'Macquarie Group is a global financial services firm headquartered in Sydney, known as the "millionaires\' factory." It specialises in infrastructure, energy, commodities and financial assets. Macquarie Asset Management is one of the world\'s largest infrastructure managers, with over $900B AUM globally.',
  },
  // ── ASX Resources ───────────────────────────────────────────────────────────
  BHP: {
    ticker: 'BHP', name: 'BHP Group', exchange: 'ASX',
    sector: 'Mining', sectorColor: '#2ed494', type: 'STOCK',
    price: 44.82, change: -2.30, changeAbs: -1.05, currency: 'AUD',
    marketCap: '$225B', volume: '12.4M', high52w: 52.10, low52w: 38.40,
    peRatio: 14.2, dividend: 5.8,
    description: 'BHP is the world\'s largest mining company by market cap, producing iron ore, copper, coal, and nickel across Australia, the Americas, and beyond. Its Pilbara iron ore operations ship over 250Mt per year to Chinese steel mills. BHP is strategically expanding into copper, which it views as critical for the energy transition, with operations in Chile and South Australia.',
    links: [{ label: 'Investor Relations', url: 'https://www.bhp.com/investors' }],
  },
  RIO: {
    ticker: 'RIO', name: 'Rio Tinto', exchange: 'ASX',
    sector: 'Mining', sectorColor: '#2ed494', type: 'STOCK',
    price: 120.44, change: -1.12, changeAbs: -1.36, currency: 'AUD',
    marketCap: '$185B', volume: '3.8M', high52w: 138.20, low52w: 102.50,
    peRatio: 10.8, dividend: 6.4,
    description: 'Rio Tinto is a leading global mining and metals company producing iron ore, aluminium, copper, and minerals. Its Pilbara iron ore business is the lowest-cost iron ore producer in the world. Rio is investing heavily in lithium through its Rincon project in Argentina and the Jadar lithium-boron project in Serbia.',
  },
  FMG: {
    ticker: 'FMG', name: 'Fortescue', exchange: 'ASX',
    sector: 'Mining', sectorColor: '#2ed494', type: 'STOCK',
    price: 22.18, change: -0.84, changeAbs: -0.19, currency: 'AUD',
    marketCap: '$68B', volume: '14.2M', high52w: 29.80, low52w: 17.20,
    peRatio: 9.4, dividend: 8.2,
    description: 'Fortescue is Australia\'s third-largest iron ore producer, founded by Andrew Forrest. The company ships from the Pilbara region and has ambitious green energy targets through Fortescue Future Industries (FFI), aiming to produce green hydrogen and decarbonise its own operations by 2030.',
  },
  WDS: {
    ticker: 'WDS', name: 'Woodside Energy', exchange: 'ASX',
    sector: 'Energy', sectorColor: '#f97316', type: 'STOCK',
    price: 24.12, change: 2.81, changeAbs: 0.66, currency: 'AUD',
    marketCap: '$46B', volume: '6.3M', high52w: 31.40, low52w: 19.80,
    peRatio: 12.1, dividend: 7.2,
    description: 'Woodside Energy is Australia\'s largest oil and gas producer, with major LNG projects including the North West Shelf and Pluto Train 2 in Western Australia. Following its 2022 merger with BHP Petroleum, Woodside has a growing global portfolio including assets in the Gulf of Mexico, Senegal, and Trinidad and Tobago.',
  },
  CSL: {
    ticker: 'CSL', name: 'CSL Limited', exchange: 'ASX',
    sector: 'Healthcare', sectorColor: '#a78bfa', type: 'STOCK',
    price: 302.40, change: 0.92, changeAbs: 2.76, currency: 'AUD',
    marketCap: '$142B', volume: '1.4M', high52w: 328.00, low52w: 242.10,
    peRatio: 38.4, dividend: 1.4,
    description: 'CSL is a global biotechnology company and one of the largest companies in Australia, specialising in plasma-derived therapies, vaccines, and recombinant products. Its brands include Behring (immunoglobulins), Seqirus (flu vaccines), and Vifor Pharma (iron deficiency). CSL processes around 60 million litres of plasma annually.',
  },
  WES: {
    ticker: 'WES', name: 'Wesfarmers', exchange: 'ASX',
    sector: 'Retail', sectorColor: '#22d48a', type: 'STOCK',
    price: 82.30, change: 0.48, changeAbs: 0.39, currency: 'AUD',
    marketCap: '$93B', volume: '2.9M', high52w: 86.40, low52w: 58.20,
    peRatio: 32.8, dividend: 2.8,
    description: 'Wesfarmers is one of Australia\'s largest companies, operating Bunnings (hardware), Kmart, Target, Officeworks, and the Chemicals, Energy and Fertilisers division. The conglomerate model gives it earnings diversification across consumer retail and industrial sectors. It spun off Coles in 2018 and has pivoted toward lithium mining via its Mt Holland project.',
  },
  WOW: {
    ticker: 'WOW', name: 'Woolworths Group', exchange: 'ASX',
    sector: 'Consumer', sectorColor: '#22d48a', type: 'STOCK',
    price: 30.42, change: -0.52, changeAbs: -0.16, currency: 'AUD',
    marketCap: '$36B', volume: '5.2M', high52w: 38.80, low52w: 28.40,
    peRatio: 22.1, dividend: 3.8,
    description: 'Woolworths is Australia\'s largest supermarket chain with over 1,000 stores, operating Woolworths Supermarkets, Big W, Dan Murphy\'s and BWS. The company has faced significant political scrutiny over grocery pricing amid cost-of-living pressures. It is investing in supply chain automation and its Everyday Rewards loyalty ecosystem.',
  },
  TLS: {
    ticker: 'TLS', name: 'Telstra Group', exchange: 'ASX',
    sector: 'Telecom', sectorColor: '#5b8af5', type: 'STOCK',
    price: 4.18, change: 0.24, changeAbs: 0.01, currency: 'AUD',
    marketCap: '$50B', volume: '22.4M', high52w: 4.48, low52w: 3.52,
    peRatio: 28.4, dividend: 4.4,
    description: 'Telstra is Australia\'s largest telecommunications company, operating the country\'s largest 4G and 5G networks. Following its T22 restructure, Telstra split into InfraCo (towers and passive infrastructure) and ServeCo (services). The InfraCo towers business is independently valued, with a potential future listing or sale being market speculation.',
  },
  GMG: {
    ticker: 'GMG', name: 'Goodman Group', exchange: 'ASX',
    sector: 'Property', sectorColor: '#a78bfa', type: 'STOCK',
    price: 38.42, change: 1.24, changeAbs: 0.47, currency: 'AUD',
    marketCap: '$73B', volume: '3.1M', high52w: 40.80, low52w: 24.20,
    peRatio: 44.2, dividend: 0.8,
    description: 'Goodman Group is the world\'s largest listed industrial property group, specialising in logistics and data centre properties globally. It has benefited enormously from AI data centre demand — over 75% of its development pipeline is now data centres. Goodman operates in 17 countries with $84B in assets under management.',
  },
  XRO: {
    ticker: 'XRO', name: 'Xero', exchange: 'ASX',
    sector: 'Tech', sectorColor: '#a78bfa', type: 'STOCK',
    price: 186.40, change: 2.14, changeAbs: 3.92, currency: 'AUD',
    marketCap: '$28B', volume: '0.8M', high52w: 198.20, low52w: 104.40,
    peRatio: 88.2, dividend: 0,
    description: 'Xero is a New Zealand-founded cloud accounting software company listed on the ASX, serving over 4 million subscribers globally. It dominates the Australian and NZ small business accounting market and is growing rapidly in the UK and North America. Xero is leveraging AI to automate bookkeeping and expand its platform ecosystem.',
  },
  PLS: {
    ticker: 'PLS', name: 'Pilbara Minerals', exchange: 'ASX',
    sector: 'Mining', sectorColor: '#22d48a', type: 'STOCK',
    price: 2.84, change: -3.41, changeAbs: -0.10, currency: 'AUD',
    marketCap: '$8.5B', volume: '28.4M', high52w: 4.82, low52w: 2.44,
    peRatio: 18.4, dividend: 2.2,
    description: 'Pilbara Minerals operates the Pilgangoora lithium-tantalum project in Western Australia, one of the world\'s largest hard-rock lithium deposits. PLS sells spodumene concentrate to lithium chemical converters in China, South Korea, and Japan. Its fortunes are closely tied to lithium carbonate prices, which have been under pressure as EV demand growth moderates.',
  },
  // ── US Stocks ────────────────────────────────────────────────────────────────
  AAPL: {
    ticker: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ',
    sector: 'Tech', sectorColor: '#a78bfa', type: 'STOCK',
    price: 228.40, change: 0.82, changeAbs: 1.86, currency: 'USD',
    marketCap: '$3.5T', volume: '48.2M', high52w: 244.60, low52w: 164.08,
    peRatio: 36.2, dividend: 0.44,
    description: 'Apple is the world\'s most valuable company, known for the iPhone, Mac, iPad, Apple Watch, and services including the App Store, Apple Music, and iCloud. Services revenue now exceeds $100B annually, providing high-margin recurring income. Apple\'s AI strategy — Apple Intelligence — is positioned as a key driver for the next iPhone upgrade cycle.',
  },
  NVDA: {
    ticker: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ',
    sector: 'Tech', sectorColor: '#22d48a', type: 'STOCK',
    price: 142.80, change: 3.24, changeAbs: 4.48, currency: 'USD',
    marketCap: '$3.5T', volume: '182.4M', high52w: 153.13, low52w: 47.32,
    peRatio: 54.8, dividend: 0.01,
    description: 'NVIDIA designs GPUs and AI computing platforms that have become the dominant infrastructure for training and running AI models. Its H100 and Blackwell chips are sold at massive premiums with multi-quarter backlogs. NVIDIA now derives over 80% of revenue from its Data Center segment, making it the primary pick-and-shovel play on the AI investment cycle.',
  },
  MSFT: {
    ticker: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ',
    sector: 'Tech', sectorColor: '#5b8af5', type: 'STOCK',
    price: 444.80, change: 0.64, changeAbs: 2.84, currency: 'USD',
    marketCap: '$3.3T', volume: '18.4M', high52w: 468.35, low52w: 385.58,
    peRatio: 38.4, dividend: 0.75,
    description: 'Microsoft is a global technology leader operating across cloud (Azure), productivity software (Office 365, Teams), gaming (Xbox, Activision Blizzard), and AI via its $13B partnership with OpenAI. Azure is the world\'s #2 cloud platform, growing 29% YoY. Microsoft Copilot is being embedded across its entire product suite.',
  },
  TSLA: {
    ticker: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ',
    sector: 'Automotive', sectorColor: '#ff4f4f', type: 'STOCK',
    price: 248.40, change: -1.84, changeAbs: -4.64, currency: 'USD',
    marketCap: '$792B', volume: '98.4M', high52w: 488.54, low52w: 138.80,
    peRatio: 82.4, dividend: 0,
    description: 'Tesla is the world\'s leading electric vehicle manufacturer, also operating energy storage and solar businesses. It has faced intense competition from Chinese EV makers including BYD. CEO Elon Musk\'s political activities have become a distraction and reportedly affected demand in some markets. Tesla\'s Full Self-Driving (FSD) and Robotaxi plans are central to its long-term valuation thesis.',
  },
  GOOGL: {
    ticker: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ',
    sector: 'Tech', sectorColor: '#5b8af5', type: 'STOCK',
    price: 184.20, change: 1.12, changeAbs: 2.04, currency: 'USD',
    marketCap: '$2.3T', volume: '22.4M', high52w: 208.70, low52w: 148.07,
    peRatio: 24.8, dividend: 0.20,
    description: 'Alphabet is Google\'s parent company, operating the world\'s dominant search engine, YouTube, Google Cloud, and the Waymo autonomous vehicle unit. Google Search faces its first existential challenge from AI-powered competitors including ChatGPT and Perplexity. Google Cloud is the fastest-growing of the three major platforms, gaining share in AI infrastructure.',
  },
  META: {
    ticker: 'META', name: 'Meta Platforms', exchange: 'NASDAQ',
    sector: 'Tech', sectorColor: '#5b8af5', type: 'STOCK',
    price: 622.40, change: 1.84, changeAbs: 11.24, currency: 'USD',
    marketCap: '$1.6T', volume: '12.4M', high52w: 740.91, low52w: 414.50,
    peRatio: 28.4, dividend: 0.50,
    description: 'Meta operates Facebook, Instagram, WhatsApp, and Threads, reaching 3.2 billion daily active users across its Family of Apps. After the costly metaverse pivot, Meta\'s 2023 "Year of Efficiency" dramatically improved margins. Meta AI is being integrated across all its platforms, and Llama is its open-source large language model competing with OpenAI.',
  },
  AMZN: {
    ticker: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ',
    sector: 'Tech', sectorColor: '#f97316', type: 'STOCK',
    price: 224.40, change: 0.92, changeAbs: 2.04, currency: 'USD',
    marketCap: '$2.4T', volume: '38.4M', high52w: 242.52, low52w: 151.61,
    peRatio: 44.8, dividend: 0,
    description: 'Amazon is the world\'s largest e-commerce company and the leader in cloud computing through AWS. AWS generates ~$100B annually and accounts for the majority of Amazon\'s operating profit. Amazon is also a major player in digital advertising, which has grown into a multi-billion dollar business leveraging its shopper intent data.',
  },
  // ── Commodities ──────────────────────────────────────────────────────────────
  GOLD: {
    ticker: 'GOLD', name: 'Gold Spot', exchange: 'LBMA',
    sector: 'Commodities', sectorColor: '#e8b84b', type: 'COMMODITY',
    price: 3298, change: 0.42, changeAbs: 13.80, currency: 'USD',
    high52w: 3320, low52w: 2020,
    description: 'Gold is the world\'s oldest store of value, priced in USD per troy ounce. It is historically used as a safe haven against inflation, currency devaluation, and geopolitical risk. Central banks — particularly in China, India, and Eastern Europe — have been net buyers for five consecutive years. Real (inflation-adjusted) bond yields are the primary driver of gold prices: when real yields fall, gold rises.',
  },
  OIL: {
    ticker: 'OIL', name: 'Crude Oil (WTI)', exchange: 'NYMEX',
    sector: 'Commodities', sectorColor: '#f97316', type: 'COMMODITY',
    price: 78.42, change: -1.24, changeAbs: -0.98, currency: 'USD',
    high52w: 95.10, low52w: 64.38,
    description: 'West Texas Intermediate (WTI) is the benchmark crude oil price for North American production. Oil prices are influenced by OPEC+ production decisions, US shale output, global demand (particularly from China), and geopolitical risk. The energy transition is creating long-run demand uncertainty, while near-term undersupply risk remains.',
  },
  // ── FX ───────────────────────────────────────────────────────────────────────
  AUD: {
    ticker: 'AUD', name: 'Australian Dollar / US Dollar', exchange: 'FOREX',
    sector: 'FX', sectorColor: '#22d48a', type: 'FX',
    price: 0.6482, change: -0.28, changeAbs: -0.0018, currency: 'USD',
    high52w: 0.6850, low52w: 0.6170,
    description: 'The AUD/USD exchange rate reflects Australia\'s economic relationship with the US and global risk sentiment. The Australian dollar is a commodity currency — it rises with iron ore and coal prices and falls during risk-off markets. RBA monetary policy relative to the US Fed is the primary macro driver of AUD/USD.',
  },
  // ── Indices ──────────────────────────────────────────────────────────────────
  XJO: {
    ticker: 'XJO', name: 'ASX 200 Index', exchange: 'ASX',
    sector: 'Index', sectorColor: '#e8b84b', type: 'INDEX',
    price: 8242, change: 0.38, changeAbs: 31.28, currency: 'AUD',
    high52w: 8615, low52w: 6840,
    description: 'The S&P/ASX 200 is Australia\'s primary equity index, tracking the 200 largest companies listed on the ASX by float-adjusted market capitalisation. It is heavily weighted toward financials (~30%) and materials (~20%). The index is reviewed quarterly by S&P Dow Jones Indices. It is the benchmark for Australian superannuation funds and ETFs.',
  },
  SPX: {
    ticker: 'SPX', name: 'S&P 500 Index', exchange: 'NYSE',
    sector: 'Index', sectorColor: '#5b8af5', type: 'INDEX',
    price: 5842, change: 0.62, changeAbs: 36.02, currency: 'USD',
    high52w: 6147, low52w: 4835,
    description: 'The S&P 500 is the primary benchmark for the US equity market, tracking 500 large-cap companies across 11 sectors. The "Magnificent Seven" technology stocks (Apple, Microsoft, NVIDIA, Alphabet, Amazon, Meta, Tesla) account for over 30% of the index, creating significant concentration risk. The S&P 500 is the most widely tracked index in the world.',
  },
  RBA: {
    ticker: 'RBA', name: 'Reserve Bank of Australia', exchange: '–',
    sector: 'Monetary Policy', sectorColor: '#e8b84b', type: 'MONETARY_POLICY',
    price: 4.10, change: 0, changeAbs: 0, currency: '%',
    high52w: 4.35, low52w: 4.10,
    description: 'The Reserve Bank of Australia sets the official cash rate — the benchmark interest rate for Australia. The RBA\'s primary mandate is price stability (inflation between 2–3%) and full employment. Rate decisions are made by the Monetary Policy Board at each meeting. Markets closely watch RBA communications for guidance on the future rate path.',
    links: [{ label: 'RBA.gov.au', url: 'https://www.rba.gov.au' }],
  },
}

// Fallback for unknown tickers
function buildFallback(ticker: string): AssetProfile {
  return {
    ticker,
    name: ticker,
    exchange: 'ASX',
    sector: 'Equities',
    sectorColor: '#5b8af5',
    type: 'STOCK',
    price: 10.00,
    change: 0,
    changeAbs: 0,
    currency: 'AUD',
    high52w: 12.00,
    low52w: 8.00,
    description: `${ticker} is listed on the ASX. No detailed profile is available yet. Check the company\'s investor relations page for the latest information.`,
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker  = params.ticker.toUpperCase()
  const profile = PROFILES[ticker] ?? buildFallback(ticker)

  // ── Fetch real price + chart from Yahoo Finance in parallel ───────────────
  const yahooSym = assetToYahoo(ticker, profile.type)

  const [liveQuotes, historicalPoints] = await Promise.all([
    yahooSym ? fetchQuotes([ticker]).catch(() => new Map()) : Promise.resolve(new Map()),
    yahooSym ? fetchHistoricalChart(yahooSym, '1y').catch(() => []) : Promise.resolve([]),
  ])

  // Merge live quote into profile (override ghost price if real data available)
  const liveQuote = liveQuotes.get(ticker)
  const liveProfile = liveQuote
    ? {
        ...profile,
        price:     liveQuote.price,
        change:    liveQuote.change,
        changeAbs: liveQuote.changeAbs,
        isLive:    true,
      }
    : { ...profile, isLive: false }

  // Build chart array — real closes if available, ghost fallback otherwise
  const chart: number[] = historicalPoints.length > 0
    ? historicalPoints.map(p => p.close)
    : ghostChart(liveProfile.price, profile.type === 'COMMODITY' ? 0.022 : 0.018, 0.09)

  // ── Articles from DB ───────────────────────────────────────────────────────
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
            { sector: profile.sector },
            { title: { contains: ticker, mode: 'insensitive' } },
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

  return NextResponse.json(
    {
      profile: liveProfile,
      chart,
      chartIsReal: historicalPoints.length > 0,
      articles: articles.map(a => ({
        id:          a.id,
        title:       a.title,
        summary:     a.summary,
        publishedAt: a.publishedAt,
        source:      a.source.name,
        sector:      a.sector,
      })),
    },
    { headers: { 'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=60' } }
  )
}
