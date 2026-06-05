// ─── Fiscus Live Source Registry ─────────────────────────────────────────────
// All sources polled by the ingestion pipeline. Each has a stable `id` used as
// the DB Source.id so re-runs are idempotent.

export interface SourceDefinition {
  id: string
  name: string
  url: string
  rssUrl: string | null
  type: 'OFFICIAL_API' | 'RSS_FEED' | 'LICENSED_FEED' | 'WEB_SCRAPER' | 'MARKET_DATA_API'
  credibility: 'OFFICIAL' | 'TIER_1_MEDIA' | 'MARKET_DATA' | 'OTHER'
  sector: string | null
  maxItems: number
}

export const SOURCES: SourceDefinition[] = [
  // ── Official Government / Regulatory ────────────────────────────────────────
  {
    id: 'rba-media-releases',
    name: 'Reserve Bank of Australia',
    url: 'https://www.rba.gov.au',
    rssUrl: 'https://www.rba.gov.au/rss/rss-cb-media-releases.xml',
    type: 'RSS_FEED',
    credibility: 'OFFICIAL',
    sector: 'Monetary Policy',
    maxItems: 10,
  },
  {
    id: 'rba-speeches',
    name: 'RBA Speeches',
    url: 'https://www.rba.gov.au',
    rssUrl: 'https://www.rba.gov.au/rss/rss-cb-speeches.xml',
    type: 'RSS_FEED',
    credibility: 'OFFICIAL',
    sector: 'Monetary Policy',
    maxItems: 5,
  },
  {
    id: 'rba-decisions',
    name: 'RBA Rate Decisions',
    url: 'https://www.rba.gov.au',
    rssUrl: 'https://www.rba.gov.au/rss/rss-cb-decisions.xml',
    type: 'RSS_FEED',
    credibility: 'OFFICIAL',
    sector: 'Monetary Policy',
    maxItems: 5,
  },
  {
    id: 'abs-releases',
    name: 'Australian Bureau of Statistics',
    url: 'https://www.abs.gov.au',
    rssUrl: 'https://www.abs.gov.au/rss/14.rss',
    type: 'RSS_FEED',
    credibility: 'OFFICIAL',
    sector: 'Macroeconomics',
    maxItems: 10,
  },
  {
    id: 'asx-announcements',
    name: 'ASX Company Announcements',
    url: 'https://www.asx.com.au',
    rssUrl: null, // uses custom API fetcher
    type: 'OFFICIAL_API',
    credibility: 'OFFICIAL',
    sector: null,
    maxItems: 30,
  },
  {
    id: 'apra-releases',
    name: 'APRA Media Releases',
    url: 'https://www.apra.gov.au',
    rssUrl: 'https://www.apra.gov.au/media-releases.xml',
    type: 'RSS_FEED',
    credibility: 'OFFICIAL',
    sector: 'Banking',
    maxItems: 5,
  },

  // ── Tier 1 Australian Media ──────────────────────────────────────────────────
  {
    id: 'abc-business',
    name: 'ABC News Business',
    url: 'https://www.abc.net.au/news/business',
    rssUrl: 'https://www.abc.net.au/news/feed/51120/rss.xml',
    type: 'RSS_FEED',
    credibility: 'TIER_1_MEDIA',
    sector: null,
    maxItems: 15,
  },
  {
    id: 'smh-business',
    name: 'Sydney Morning Herald',
    url: 'https://www.smh.com.au/business',
    rssUrl: 'https://www.smh.com.au/rss/business.xml',
    type: 'RSS_FEED',
    credibility: 'TIER_1_MEDIA',
    sector: null,
    maxItems: 15,
  },
  {
    id: 'theage-business',
    name: 'The Age Business',
    url: 'https://www.theage.com.au/business',
    rssUrl: 'https://www.theage.com.au/rss/business.xml',
    type: 'RSS_FEED',
    credibility: 'TIER_1_MEDIA',
    sector: null,
    maxItems: 10,
  },
  {
    id: 'guardian-australia-business',
    name: 'The Guardian Australia — Business',
    url: 'https://www.theguardian.com/australia-news/business',
    rssUrl: 'https://www.theguardian.com/australia-news/business/rss',
    type: 'RSS_FEED',
    credibility: 'TIER_1_MEDIA',
    sector: null,
    maxItems: 10,
  },
  {
    id: 'reuters-business',
    name: 'Reuters Business',
    url: 'https://www.reuters.com/business',
    rssUrl: 'https://feeds.reuters.com/reuters/businessNews',
    type: 'RSS_FEED',
    credibility: 'TIER_1_MEDIA',
    sector: null,
    maxItems: 15,
  },
  {
    id: 'reuters-markets',
    name: 'Reuters Markets',
    url: 'https://www.reuters.com/markets',
    rssUrl: 'https://feeds.reuters.com/reuters/companyNews',
    type: 'RSS_FEED',
    credibility: 'TIER_1_MEDIA',
    sector: null,
    maxItems: 10,
  },

  // ── Market Data & Financial News ─────────────────────────────────────────────
  {
    id: 'yahoo-finance-au',
    name: 'Yahoo Finance',
    url: 'https://finance.yahoo.com',
    rssUrl: 'https://finance.yahoo.com/news/rssindex',
    type: 'RSS_FEED',
    credibility: 'MARKET_DATA',
    sector: null,
    maxItems: 15,
  },
  {
    id: 'marketwatch',
    name: 'MarketWatch',
    url: 'https://www.marketwatch.com',
    rssUrl: 'https://feeds.marketwatch.com/marketwatch/topstories/',
    type: 'RSS_FEED',
    credibility: 'MARKET_DATA',
    sector: null,
    maxItems: 10,
  },
  {
    id: 'investing-com',
    name: 'Investing.com',
    url: 'https://www.investing.com',
    rssUrl: 'https://www.investing.com/rss/news.rss',
    type: 'RSS_FEED',
    credibility: 'MARKET_DATA',
    sector: null,
    maxItems: 10,
  },
]

// ── Top ASX tickers to monitor for company-specific announcements ─────────────
export const ASX_WATCHLIST = [
  // Big 4 Banks + Macquarie
  'CBA', 'WBC', 'ANZ', 'NAB', 'MQG',
  // Resources
  'BHP', 'RIO', 'FMG', 'MIN', 'S32', 'OZL', 'NST', 'EVN', 'NCM',
  // Energy
  'WDS', 'STO', 'VEA', 'ALD',
  // Tech & Exchange
  'ASX', 'CPU', 'XRO', 'WTC', 'ALU',
  // Consumer / Retail
  'WES', 'WOW', 'COL', 'JBH',
  // Healthcare
  'CSL', 'RMD', 'COH', 'SHL', 'MPL',
  // Infrastructure / Utilities
  'TLS', 'TCL', 'APA', 'AGL', 'ORG',
  // Property
  'GMG', 'GPT', 'SGP', 'DXS',
  // Insurance
  'QBE', 'IAG', 'SUN',
]

// ── Sector → brand colour map ────────────────────────────────────────────────
export const SECTOR_COLORS: Record<string, string> = {
  'Banking': '#5b8af5',
  'Mining': '#2ed494',
  'Energy': '#f97316',
  'Technology': '#a78bfa',
  'Healthcare': '#06b6d4',
  'Property': '#ec4899',
  'Retail': '#f59e0b',
  'Insurance': '#84cc16',
  'Infrastructure': '#64748b',
  'Utilities': '#22d3ee',
  'Consumer Staples': '#fb923c',
  'Industrials': '#94a3b8',
  'Monetary Policy': '#d4a843',
  'Macroeconomics': '#d4a843',
  'Interest Rates': '#d4a843',
  'M&A': '#e879f9',
  'Exchange': '#a78bfa',
  'Commodities': '#d4a843',
  'default': '#5b8af5',
}
