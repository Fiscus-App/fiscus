import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const [saves, insightfuls, watches] = await Promise.all([
    db.articleSave.count({ where: { userId: session.user.id } }),
    db.articleInsightful.count({ where: { userId: session.user.id } }),
    db.watchHistory.count({ where: { userId: session.user.id } }),
  ])

  return NextResponse.json({ saves, insightfuls, watches })
}
