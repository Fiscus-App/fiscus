import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get('cursor')
  const limit = 50

  const messages = await db.teamMessage.findMany({
    where: { teamId: params.teamId },
    include: {
      user: { select: { id: true, name: true, image: true } },
      video: {
        select: {
          id: true,
          title: true,
          thumbnailUrl: true,
          article: {
            select: {
              title: true,
              sector: true,
              relatedTickers: true,
              source: { select: { name: true, credibility: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })

  return NextResponse.json({
    messages: messages.reverse(),
    nextCursor: messages.length === limit ? messages[0].id : null,
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const { content, type, videoId, userId } = await req.json()

  if (!content && type === 'TEXT') {
    return NextResponse.json({ error: 'Content required' }, { status: 400 })
  }

  const message = await db.teamMessage.create({
    data: {
      teamId: params.teamId,
      userId,
      content: content ?? '',
      type: type ?? 'TEXT',
      videoId: videoId ?? null,
    },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  })

  return NextResponse.json(message, { status: 201 })
}
