import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Toggle the current user's "insightful" vote on an article and return the new
// aggregate count across all users.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { articleId } = await req.json().catch(() => ({}))
  if (!articleId) {
    return NextResponse.json({ error: 'articleId required' }, { status: 400 })
  }

  try {
    const existing = await db.articleInsightful.findUnique({
      where: { userId_articleId: { userId: session.user.id, articleId } },
    })

    if (existing) {
      await db.articleInsightful.delete({ where: { id: existing.id } })
    } else {
      await db.articleInsightful.create({ data: { userId: session.user.id, articleId } })
    }

    const count = await db.articleInsightful.count({ where: { articleId } })
    return NextResponse.json({ insightful: !existing, count })
  } catch {
    return NextResponse.json({ error: 'Could not record vote' }, { status: 500 })
  }
}
