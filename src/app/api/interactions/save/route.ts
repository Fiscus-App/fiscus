import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { articleId } = await req.json()
  if (!articleId) {
    return NextResponse.json({ error: 'articleId required' }, { status: 400 })
  }

  const existing = await db.articleSave.findUnique({
    where: { userId_articleId: { userId: session.user.id, articleId } },
  })

  if (existing) {
    await db.articleSave.delete({ where: { id: existing.id } })
    return NextResponse.json({ saved: false })
  } else {
    await db.articleSave.create({
      data: { userId: session.user.id, articleId },
    })
    return NextResponse.json({ saved: true })
  }
}
