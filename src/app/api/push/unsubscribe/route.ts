import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db, dbAvailable } from '@/lib/db'

// POST /api/push/unsubscribe
// Body: { endpoint: string }
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  if (!dbAvailable) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }

  const { endpoint } = await req.json().catch(() => ({}))
  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })
  }

  try {
    await db.pushSubscription.deleteMany({ where: { endpoint, userId: session.user.id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Could not remove subscription' }, { status: 500 })
  }
}
