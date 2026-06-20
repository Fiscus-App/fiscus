import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db, dbAvailable } from '@/lib/db'

// GET /api/account/export
// Returns a downloadable JSON archive of the signed-in user's data.
// Secrets (password hash, tokens, 2FA secret/backup codes) are never included.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  if (!dbAvailable) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }

  const userId = session.user.id

  const [user, follows, articleSaves, articleInsightfuls, watchHistory, memberships] =
    await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: {
          id: true, email: true, name: true, image: true, role: true, tier: true,
          emailVerified: true, createdAt: true, updatedAt: true,
        },
      }),
      db.userFollow.findMany({
        where: { userId },
        select: { type: true, value: true, label: true, meta: true, createdAt: true },
      }),
      db.articleSave.findMany({
        where: { userId },
        select: { savedAt: true, article: { select: { title: true, url: true, source: { select: { name: true } } } } },
      }),
      db.articleInsightful.findMany({
        where: { userId },
        select: { createdAt: true, article: { select: { title: true, url: true } } },
      }),
      db.watchHistory.findMany({
        where: { userId },
        select: { watchedAt: true, watchSeconds: true, completed: true, videoId: true },
      }),
      db.teamMember.findMany({
        where: { userId },
        select: { role: true, joinedAt: true, team: { select: { name: true, slug: true } } },
      }),
    ])

  const archive = {
    exportedAt: new Date().toISOString(),
    format: 'fiscus-account-export-v1',
    account: user,
    following: follows,
    savedArticles: articleSaves,
    insightfulVotes: articleInsightfuls,
    watchHistory,
    teams: memberships,
  }

  const filename = `fiscus-data-export-${new Date().toISOString().slice(0, 10)}.json`

  return new NextResponse(JSON.stringify(archive, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
