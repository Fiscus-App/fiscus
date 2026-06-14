import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db, dbAvailable } from '@/lib/db'

// GET  /api/following  → return user's follows
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ follows: [] })

  if (!dbAvailable) return NextResponse.json({ follows: [] })

  try {
    const follows = await db.userFollow.findMany({
      where: { userId: session.user.id },
      orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
    })
    return NextResponse.json({ follows })
  } catch {
    return NextResponse.json({ follows: [] })
  }
}

// POST /api/following  → add a follow
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, value, label, meta } = await req.json()
  if (!type || !value || !label) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  if (!dbAvailable) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 })

  try {
    const follow = await db.userFollow.upsert({
      where: { userId_type_value: { userId: session.user.id, type, value } },
      create: { userId: session.user.id, type, value, label, meta: meta ? JSON.stringify(meta) : null },
      update: { label, meta: meta ? JSON.stringify(meta) : null },
    })
    return NextResponse.json({ follow })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// DELETE /api/following  → remove a follow
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, value } = await req.json()
  if (!type || !value) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  if (!dbAvailable) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 })

  try {
    await db.userFollow.deleteMany({
      where: { userId: session.user.id, type, value },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
