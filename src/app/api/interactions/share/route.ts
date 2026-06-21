import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

// Record a share action and return the new aggregate share count for the
// article (tracked across all users).
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
    await db.articleShare.create({ data: { userId: session.user.id, articleId } })
    const count = await db.articleShare.count({ where: { articleId } })
    return NextResponse.json({ shared: true, count })
  } catch {
    return NextResponse.json({ error: 'Could not record share' }, { status: 500 })
  }
}
