'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { VideoCard } from '@/components/feed/VideoCard'
import { RefreshCw } from 'lucide-react'
import type { FeedItem } from '@/types'

const MOCK_FEED: FeedItem[] = [
  {
    id: '1',
    ticker: 'CBA',
    company: 'Commonwealth Bank',
    sector: 'Banking',
    category: 'Earnings',
    sectorColor: '#5b8af5',
    headline: 'CBA Posts Record $10.2B Full-Year Cash Profit, Beats Estimates by 4.1%',
    teaser: 'Commonwealth Bank reported cash profit of $10.2B for FY24, up 6.2% YoY, driven by NIM expansion and lower loan loss provisions.',
    script: 'Commonwealth Bank delivered a record $10.2 billion cash profit for FY2024, surpassing consensus estimates by 4.1%. Net interest margin held at 2.03%, while loan impairment charges fell 12% to $1.1 billion. The board declared a final dividend of $2.50 per share, fully franked. CBA shares have outperformed the ASX 200 by 18 percentage points year-to-date. Source: Commonwealth Bank of Australia.',
    source: 'CBA Investor Relations',
    sourceType: 'OFFICIAL',
    sourceUrl: 'https://www.commbank.com.au/investors',
    change: 1.82, price: 162.40,
    tags: ['CBA', 'Banking', 'Earnings', 'Dividends', 'ASX200'],
    publishedAt: '2h ago',
    insightfulCount: 2847,
    chartData: [155, 156.5, 155.8, 158, 159.5, 158.2, 160.1, 161.8, 162.4],
    videoStatus: 'COMPLETE', isInsightful: true, isSaved: false,
  },
  {
    id: '2',
    ticker: 'RBA',
    company: 'Reserve Bank of Australia',
    sector: 'Monetary Policy',
    category: 'Central Bank',
    sectorColor: '#d4a843',
    headline: 'RBA Holds Cash Rate at 4.10% — Board Signals Possible Cut in November',
    teaser: 'The RBA voted 6-3 to hold at 4.10%, with dissenting members favouring an immediate 25bp cut amid softening labour market data.',
    script: "The Reserve Bank of Australia held its cash rate at 4.10% at today's October board meeting, with a 6-3 split vote. Board dissenters cited trimmed mean CPI moderating to 3.2% and unemployment rising to 4.3%. OIS markets now price a 68% probability of a 25 basis point cut at the November meeting. Source: Reserve Bank of Australia.",
    source: 'Reserve Bank of Australia',
    sourceType: 'OFFICIAL',
    sourceUrl: 'https://www.rba.gov.au',
    change: null, price: null,
    tags: ['RBA', 'Interest Rates', 'Monetary Policy', 'Inflation', 'AUD'],
    publishedAt: '45m ago',
    insightfulCount: 5921,
    chartData: null,
    videoStatus: 'PENDING', isInsightful: false, isSaved: true,
  },
  {
    id: '3',
    ticker: 'BHP',
    company: 'BHP Group',
    sector: 'Mining',
    category: 'Operations',
    sectorColor: '#2ed494',
    headline: 'BHP Iron Ore Shipments Fall 8% on Pilbara Cyclone; Full-Year Guidance Cut',
    teaser: 'BHP reported Q1 iron ore shipments of 62.1Mt, down 8.3% QoQ, after Cyclone Bianca disrupted Port Hedland operations for 11 days.',
    script: 'BHP shipped 62.1 million tonnes of iron ore in the September quarter, an 8.3% decline quarter-on-quarter after Cyclone Bianca disrupted Port Hedland for 11 days. Full-year guidance was revised to 250–255Mt from 255–265Mt. Realised iron ore price of USD $89.40 per tonne was 6.2% below the prior year. Source: BHP Group Limited.',
    source: 'BHP Investor Relations',
    sourceType: 'OFFICIAL',
    sourceUrl: 'https://www.bhp.com/investors',
    change: -2.30, price: 44.82,
    tags: ['BHP', 'Mining', 'Iron Ore', 'Pilbara', 'Commodities'],
    publishedAt: '3h ago',
    insightfulCount: 1243,
    chartData: [47.5, 47.1, 46.4, 45.9, 45.2, 44.6, 44.1, 44.82],
    videoStatus: 'PENDING', isInsightful: false, isSaved: false,
  },
  {
    id: '4',
    ticker: 'WDS',
    company: 'Woodside Energy',
    sector: 'Energy',
    category: 'M&A',
    sectorColor: '#f97316',
    headline: 'Woodside in Advanced Talks to Acquire US LNG Terminal Stake for USD $2.35B',
    teaser: 'Woodside is in exclusive negotiations for a 49% stake in a Louisiana LNG terminal, potentially doubling its global LNG capacity.',
    script: 'Woodside Energy confirmed exclusive negotiations to acquire a 49% interest in the Calcasieu Pass 2 LNG terminal in Louisiana for USD $2.35 billion, nearly doubling its 5.5 Mtpa export position. Completion is expected in H1 2025 subject to FIRB and US FERC approval. Source: Australian Financial Review.',
    source: 'Australian Financial Review',
    sourceType: 'TIER_1_MEDIA',
    sourceUrl: 'https://www.afr.com',
    change: 2.81, price: 24.12,
    tags: ['WDS', 'Energy', 'LNG', 'M&A', 'USA'],
    publishedAt: '1h ago',
    insightfulCount: 892,
    chartData: [22.8, 23.0, 23.3, 23.6, 23.9, 24.1, 24.12],
    videoStatus: 'PENDING', isInsightful: false, isSaved: false,
  },
  {
    id: '5',
    ticker: 'GOLD',
    company: 'Gold Spot',
    sector: 'Commodities',
    category: 'Market Data',
    sectorColor: '#d4a843',
    headline: 'Gold Hits USD $3,298/oz — Safe Haven Demand Surges on Fed Pivot Speculation',
    teaser: 'Gold extended its rally to USD $3,298/oz, up 24% YTD, as traders price in a faster-than-expected Fed easing cycle.',
    script: 'Gold spot prices reached a record USD $3,298 per troy ounce, extending year-to-date gains to 24.3%. Real yields on 10-year TIPS fell to negative 0.18%. Central bank gold purchases reached 1,037 tonnes in 2023, the second-highest on record. Australian producers Newmont and Northern Star are at 52-week highs. Source: LBMA Gold Price.',
    source: 'LBMA',
    sourceType: 'MARKET_DATA',
    sourceUrl: 'https://www.lbma.org.uk',
    change: 0.42, price: 3298,
    tags: ['Gold', 'Commodities', 'Fed', 'Safe Haven', 'Precious Metals'],
    publishedAt: '30m ago',
    insightfulCount: 4521,
    chartData: [3100, 3140, 3175, 3210, 3245, 3270, 3298],
    videoStatus: 'PENDING', isInsightful: true, isSaved: false,
  },
  {
    id: '6',
    ticker: 'ASX',
    company: 'ASX Limited',
    sector: 'Exchange',
    category: 'Infrastructure',
    sectorColor: '#a78bfa',
    headline: 'ASX CHESS Replacement Approved: $250M DTCC-Backed System Goes Live Q3 2025',
    teaser: "ASX's board approved the DTCC-backed CHESS replacement, with phased migration beginning September 2025 and full cutover in Q1 2026.",
    script: "The ASX board approved the DTCC DASL-backed CHESS replacement at AUD $250 million, with phased migration from September 2025 and full cutover in Q1 2026. This follows the 2022 abandonment of the DLT-based system after a $250 million write-down. ASX expects a 34% reduction in per-trade processing costs. Source: The Australian.",
    source: 'The Australian',
    sourceType: 'TIER_1_MEDIA',
    sourceUrl: 'https://www.theaustralian.com.au',
    change: 0.65, price: 63.40,
    tags: ['ASX', 'CHESS', 'Fintech', 'Infrastructure', 'Exchange'],
    publishedAt: '5h ago',
    insightfulCount: 3102,
    chartData: [62.1, 62.5, 62.9, 63.0, 63.2, 63.4],
    videoStatus: 'PENDING', isInsightful: false, isSaved: true,
  },
]

const TABS = ['For You', 'Following', 'Markets', 'ASX']

export default function FeedPage() {
  const [tab, setTab]               = useState(0)
  const [items, setItems]           = useState<FeedItem[]>(MOCK_FEED)
  const [cardHeight, setCardHeight] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const intervalRef                 = useRef<ReturnType<typeof setInterval> | null>(null)

  // Full viewport height minus nav (70). Header is overlaid on top of video.
  useEffect(() => {
    const update = () => setCardHeight(window.innerHeight - 70)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const fetchFeed = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const res = await fetch('/api/feed?pageSize=30')
      if (!res.ok) return
      const json = await res.json()
      if (json.source === 'live' && json.data?.length > 0) setItems(json.data)
    } catch { /* stay on mock */ } finally {
      if (!silent) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchFeed(true)
    intervalRef.current = setInterval(() => fetchFeed(true), 60_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fetchFeed])

  const handleInsightful = useCallback((id: string) => {
    // Optimistic update
    setItems((prev) => prev.map((item) =>
      item.id === id ? { ...item, isInsightful: !item.isInsightful,
        insightfulCount: item.insightfulCount + (item.isInsightful ? -1 : 1) } : item
    ))
    // Persist to DB (fire and forget — UI already updated)
    fetch('/api/interactions/insightful', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId: id }),
    }).catch(() => {
      // Revert on failure
      setItems((prev) => prev.map((item) =>
        item.id === id ? { ...item, isInsightful: !item.isInsightful,
          insightfulCount: item.insightfulCount + (item.isInsightful ? -1 : 1) } : item
      ))
    })
  }, [])

  const handleSave = useCallback((id: string) => {
    // Optimistic update
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, isSaved: !item.isSaved } : item))
    // Persist to DB
    fetch('/api/interactions/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId: id }),
    }).catch(() => {
      // Revert on failure
      setItems((prev) => prev.map((item) => item.id === id ? { ...item, isSaved: !item.isSaved } : item))
    })
  }, [])

  const handleShare = useCallback((id: string) => {
    const item = items.find((i) => i.id === id)
    if (item && navigator.share) navigator.share({ title: item.headline, text: item.teaser }).catch(() => {})
  }, [items])

  if (cardHeight === 0) return null

  return (
    <div className="relative h-full" style={{ background: '#07091a' }}>

      {/* ── Feed tabs ─────────────────────────────────────────────────── */}
      <div
        className="absolute flex items-center justify-center gap-1 z-20"
        style={{ top: 54, left: 0, right: 0, paddingLeft: 8, paddingRight: 8 }}
      >
        {TABS.map((label, i) => (
          <button
            key={label}
            onClick={() => setTab(i)}
            className="relative font-sans font-semibold text-[13px] px-3 py-1 rounded-full bg-transparent border-none cursor-pointer transition-all"
            style={{
              color: tab === i ? '#fff' : 'rgba(255,255,255,0.42)',
              background: tab === i
                ? 'rgba(232,184,75,0.14)'
                : 'transparent',
              border: tab === i
                ? '1px solid rgba(232,184,75,0.28)'
                : '1px solid transparent',
              backdropFilter: tab === i ? 'blur(8px)' : 'none',
              textShadow: '0 1px 8px rgba(0,0,0,0.7)',
              transition: 'all 0.2s ease',
            }}
          >
            {label}
          </button>
        ))}
        {refreshing && (
          <RefreshCw size={11} className="animate-spin absolute right-4"
            style={{ color: 'rgba(255,255,255,0.35)' }} />
        )}
      </div>

      {/* ── Snap-scroll feed ──────────────────────────────────────────── */}
      <div className="feed-scroll h-full">
        {items.map((item) => (
          <div key={item.id} className="feed-item" style={{ height: cardHeight }}>
            <VideoCard
              item={item}
              height={cardHeight}
              onInsightful={handleInsightful}
              onSave={handleSave}
              onShare={handleShare}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
