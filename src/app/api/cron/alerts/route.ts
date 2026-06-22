import { NextRequest, NextResponse } from 'next/server'
import { db, dbAvailable } from '@/lib/db'
import { sendPushToUser, pushConfigured } from '@/lib/push-server'

export const maxDuration = 60

// Bearer-token guard so only the scheduler can trigger this (matches /cron/ingest)
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${secret}` || auth === secret
}

// Don't look back further than this on the first run for a user.
const LOOKBACK_MS = 12 * 60 * 60 * 1000

function wants(prefs: Record<string, unknown> | null, key: string): boolean {
  if (!prefs) return true // no saved prefs → opted in by default
  return prefs[key] !== false
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!dbAvailable) {
    return NextResponse.json({ ok: false, message: 'DATABASE_URL not configured' }, { status: 503 })
  }
  if (!pushConfigured()) {
    return NextResponse.json({ ok: false, message: 'VAPID keys not configured' })
  }

  const now = new Date()

  // Everyone with at least one push subscription.
  const subUsers = await db.pushSubscription.findMany({ select: { userId: true }, distinct: ['userId'] })
  const userIds: string[] = subUsers.map((u: { userId: string }) => u.userId)

  let processed = 0
  let pushed = 0

  for (const userId of userIds) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        notificationPrefs: true,
        pushLastNotifiedAt: true,
        follows: { select: { type: true, value: true } },
      },
    })
    if (!user) continue
    processed++

    let prefs: Record<string, unknown> | null = null
    try { prefs = user.notificationPrefs ? JSON.parse(user.notificationPrefs) : null } catch { prefs = null }

    const advanceCursor = () =>
      db.user.update({ where: { id: user.id }, data: { pushLastNotifiedAt: now } }).catch(() => {})

    // Master switch paused → skip but keep the cursor moving.
    if (prefs && prefs.pushEnabled === false) { await advanceCursor(); continue }

    const since = user.pushLastNotifiedAt && user.pushLastNotifiedAt > new Date(now.getTime() - LOOKBACK_MS)
      ? user.pushLastNotifiedAt
      : new Date(now.getTime() - LOOKBACK_MS)

    const tickers = user.follows.filter((f) => f.type === 'STOCK' || f.type === 'INDEX').map((f) => f.value)
    const sectors = user.follows.filter((f) => f.type === 'SECTOR').map((f) => f.value)
    if (wants(prefs, 'rbaAnnouncements')) sectors.push('Monetary Policy')

    const or: any[] = []
    if (wants(prefs, 'followNewArticle') && tickers.length) or.push({ relatedTickers: { hasSome: tickers } })
    if (sectors.length) or.push({ sector: { in: sectors } })

    if (or.length === 0) { await advanceCursor(); continue }

    const articles = await db.article.findMany({
      where: {
        publishedAt: { gt: since },
        summary: { not: null, notIn: ['__REJECTED__'] },
        OR: or,
      },
      orderBy: { publishedAt: 'desc' },
      take: 5,
      select: { id: true, title: true, sector: true, relatedTickers: true },
    })

    if (articles.length > 0) {
      const top = articles[0]
      const label = top.relatedTickers[0] ?? top.sector ?? 'Fiscus'
      const payload = articles.length === 1
        ? { title: label, body: top.title, url: `/article/${top.id}`, tag: 'fiscus-news' }
        : { title: `${articles.length} new briefings`, body: `${top.title}  ·  +${articles.length - 1} more`, url: '/feed', tag: 'fiscus-news' }

      const n = await sendPushToUser(user.id, payload)
      if (n > 0) pushed++
    }

    await advanceCursor()
  }

  return NextResponse.json({ ok: true, processed, pushed })
}

// Allow Vercel cron (GET) and manual POST
export async function GET(req: NextRequest) {
  return POST(req)
}
