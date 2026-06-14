import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db, dbAvailable } from '@/lib/db'

// GET /api/teams/[teamId]/messages
export async function GET(req: NextRequest, { params }: { params: { teamId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!dbAvailable) return NextResponse.json({ messages: [], nextCursor: null })

  // Verify membership
  const member = await db.teamMember.findUnique({
    where: { teamId_userId: { teamId: params.teamId, userId: session.user.id } },
  })
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get('cursor')
  const limit = 50

  const messages = await db.teamMessage.findMany({
    where: { teamId: params.teamId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })

  return NextResponse.json({
    messages: messages.reverse(),
    nextCursor: messages.length === limit ? messages[0].id : null,
  })
}

// POST /api/teams/[teamId]/messages
export async function POST(req: NextRequest, { params }: { params: { teamId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!dbAvailable) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 })

  // Verify membership
  const member = await db.teamMember.findUnique({
    where: { teamId_userId: { teamId: params.teamId, userId: session.user.id } },
  })
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })

  const message = await db.teamMessage.create({
    data: {
      teamId: params.teamId,
      userId: session.user.id,
      content: content.trim(),
      type: 'TEXT',
    },
    include: { user: { select: { id: true, name: true } } },
  })

  return NextResponse.json(message, { status: 201 })
}
