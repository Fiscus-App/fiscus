import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db, dbAvailable } from '@/lib/db'

// Stores the user's notification toggles server-side so the alert engine can
// respect them. Mirrors what the client also keeps in localStorage.

// GET /api/notifications/prefs → { prefs: NotificationPrefs | null }
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ prefs: null })
  if (!dbAvailable) return NextResponse.json({ prefs: null })

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { notificationPrefs: true },
    })
    return NextResponse.json({ prefs: user?.notificationPrefs ? JSON.parse(user.notificationPrefs) : null })
  } catch {
    return NextResponse.json({ prefs: null })
  }
}

// POST /api/notifications/prefs  (body: NotificationPrefs)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  if (!dbAvailable) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }

  const prefs = await req.json().catch(() => null)
  if (!prefs || typeof prefs !== 'object') {
    return NextResponse.json({ error: 'Invalid preferences' }, { status: 400 })
  }

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: { notificationPrefs: JSON.stringify(prefs) },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Could not save preferences' }, { status: 500 })
  }
}
