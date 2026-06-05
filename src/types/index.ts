// ─── Core domain types ──────────────────────────────────────────────

export type SourceCredibility = 'OFFICIAL' | 'TIER_1_MEDIA' | 'MARKET_DATA' | 'OTHER'

export interface FeedItem {
  id: string
  ticker: string
  company: string
  sector: string
  category: string
  sectorColor: string
  headline: string
  teaser: string
  script: string
  source: string
  sourceType: SourceCredibility
  sourceUrl: string
  change: number | null
  price: number | null
  tags: string[]
  publishedAt: string
  insightfulCount: number
  chartData: number[] | null
  videoStatus: 'PENDING' | 'COMPLETE' | 'FAILED'
  videoUrl?: string
  isInsightful?: boolean
  isSaved?: boolean
}

export interface MarketIndex {
  name: string
  value: number
  change: number
  changeAbs: number
}

export interface Commodity {
  name: string
  value: number
  unit: string
  change: number
}

export interface FxPair {
  pair: string
  value: number
  change: number
}

export interface SectorPerformance {
  name: string
  change: number
}

export interface MarketDashboardData {
  asx200: MarketIndex
  indices: MarketIndex[]
  commodities: Commodity[]
  forex: FxPair[]
  sectors: SectorPerformance[]
  rbaCashRate: number
  rbaNextMeeting: string
  asx200History: number[]
}

export interface TeamMessage {
  id: string
  userId: string
  userName: string
  content: string
  type: 'TEXT' | 'VIDEO_SHARE' | 'SYSTEM'
  sharedVideo?: FeedItem
  createdAt: string
}

export interface Team {
  id: string
  name: string
  slug: string
  memberCount: number
  members: TeamMember[]
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
}

// ─── Admin types ──────────────────────────────────────────────────────

export interface IngestionSource {
  id: string
  name: string
  url: string
  type: string
  credibility: SourceCredibility
  status: 'active' | 'paused' | 'error'
  articlesCount: number
  lastIngestedAt: string | null
}

export interface IngestionJob {
  id: string
  source: string
  articleTitle: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED'
  aiStatus: 'pending' | 'generated' | 'failed'
  createdAt: string
}

export interface AdminStats {
  articlesIngestedToday: number
  aiScriptsGenerated: number
  activeSources: number
  errorRate: number
  queueDepth: number
}

// ─── API response types ───────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  error?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// ─── AI types ─────────────────────────────────────────────────────────

export interface VideoScript {
  hook: string
  coreUpdate: string
  whyItMatters: string
  sourceAttrib: string
  fullScript: string
  wordCount: number
}

export interface ScriptGenerationInput {
  ticker: string
  company: string
  headline: string
  teaser: string
  sector: string
  category: string
  change: number | null
  price: number | null
  source: string
}
