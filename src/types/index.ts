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
  shareCount?: number
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

// ─── AI VIDEO COMPOSITION ───────────────────────────────────────────────
// A Fiscus "video" is a timed composition of scenes: the AI summarises the
// whole article into a sequence of beats, each pairing a narration line with
// an auto-built visual (a stat card, a chart, a pulled quote…). This renders
// client-side today; the same contract drives a server-side MP4 render later.

export type SceneKind = 'title' | 'statement' | 'stat' | 'chart' | 'bullets' | 'quote' | 'outro'

export interface TitleVisual {
  type: 'title'
  headline: string
  ticker?: string
  sector?: string
}

export interface StatementVisual {
  type: 'statement'
  /** One spoken sentence of the flowing script, shown as cinematic text. */
  text: string
}

export interface StatVisual {
  type: 'stat'
  /** Big number pulled from the article, e.g. "$4.2B", "+3.4%", "75 bps". */
  value: string
  /** What the number describes, e.g. "Half-year net profit". */
  label: string
  /** Optional signed % move for up/down colouring. */
  delta?: number | null
  /** One-line supporting context shown under the number. */
  caption?: string
}

export interface ChartVisual {
  type: 'chart'
  /** Real series only — never invented prices. Empty ⇒ scene is dropped. */
  series: number[]
  label?: string
  /** Forces up (green) / down (red) tint; inferred from series when omitted. */
  positive?: boolean
  caption?: string
}

export interface BulletsVisual {
  type: 'bullets'
  heading?: string
  points: string[]
}

export interface QuoteVisual {
  type: 'quote'
  text: string
  attribution?: string
}

export interface OutroVisual {
  type: 'outro'
  source: string
  tagline?: string
}

export type SceneVisual =
  | TitleVisual
  | StatementVisual
  | StatVisual
  | ChartVisual
  | BulletsVisual
  | QuoteVisual
  | OutroVisual

export interface VideoScene {
  id: string
  /** Caption shown this beat; the future TTS voiceover reads this line. */
  narration: string
  /** How long this scene holds, in milliseconds. */
  durationMs: number
  visual: SceneVisual
}

export interface VideoComposition {
  /** Schema version, so stored compositions stay forward-compatible. */
  version: number
  articleId?: string
  ticker: string
  sector: string
  /** Hex accent (sector colour) used to theme the whole video. */
  accent: string
  /** The full flowing narration as one paragraph (sum of scene narrations). */
  script: string
  /** Story voice/register the script was written in (selloff, earnings, …). */
  tone: string
  totalDurationMs: number
  scenes: VideoScene[]
  /** Honest provenance: built by the model, or by the deterministic fallback. */
  generator: 'ai' | 'fallback'
  generatedAt: string
}

/** Article-shaped input the composer needs to build a video. */
export interface CompositionInput {
  articleId?: string
  ticker: string
  company: string
  headline: string
  summary: string
  bodyText?: string
  sector: string
  sectorColor: string
  category: string
  source: string
  change?: number | null
  price?: number | null
  series?: number[] | null
}
