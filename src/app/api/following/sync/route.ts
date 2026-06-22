import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db, dbAvailable } from '@/lib/db'
import { FollowType } from '@prisma/client'

// POST /api/following/sync  { follows: Follow[] }
// Replaces the user's server-side follows with the provided set (localStorage is
// the client source of truth). Keeps the DB in sync for the feed + alert engine.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  if (!dbAvailable) {
    return NextResponse.json({ ok: false, source: 'no-db' })
  }

  const userId = session.user.id
  const body = await req.json().catch(() => ({}))
  const follows: { type: FollowType; value: string; label?: string; meta?: unknown }[] =
    Array.isArray(body?.follows) ? body.follows : []

  try {
    const incoming = new Set(follows.map((f) => `${f.type}:${f.value}`))
    const existing = await db.userFollow.findMany({ where: { userId } })

    // Remove follows the user no longer has.
    await Promise.all(
      existing
        .filter((e: { type: string; value: string }) => !incoming.has(`${e.type}:${e.value}`))
        .map((e: { id: string }) => db.userFollow.delete({ where: { id: e.id } }).catch(() => {})),
    )

    // Upsert the current set.
    await Promise.all(
      follows.map((f) =>
        db.userFollow
          .upsert({
            where: { userId_type_value: { userId, type: f.type, value: f.value } },
            create: {
              userId,
              type: f.type,
              value: f.value,
              label: f.label ?? f.value,
              meta: f.meta ? JSON.stringify(f.meta) : null,
            },
            update: {
              label: f.label ?? f.value,
              meta: f.meta ? JSON.stringify(f.meta) : null,
            },
          })
          .catch(() => {}),
      ),
    )

    return NextResponse.json({ ok: true, count: follows.length })
  } catch {
    return NextResponse.json({ ok: false, error: 'sync-failed' }, { status: 500 })
  }
}
