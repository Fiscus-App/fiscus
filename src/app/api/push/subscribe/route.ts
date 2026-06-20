import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db, dbAvailable } from '@/lib/db'

// POST /api/push/subscribe
// Body: { subscription: PushSubscriptionJSON, userAgent?: string }
// Stores (or refreshes) a web-push subscription for this user/device.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  if (!dbAvailable) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }

  const { subscription, userAgent } = await req.json().catch(() => ({}))
  const endpoint = subscription?.endpoint
  const p256dh   = subscription?.keys?.p256dh
  const auth     = subscription?.keys?.auth

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  try {
    await db.pushSubscription.upsert({
      where: { endpoint },
      create: { userId: session.user.id, endpoint, p256dh, auth, userAgent: userAgent ?? null },
      update: { userId: session.user.id, p256dh, auth, userAgent: userAgent ?? null },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Could not save subscription' }, { status: 500 })
  }
}
