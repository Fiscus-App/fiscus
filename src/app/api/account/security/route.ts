import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db, dbAvailable } from '@/lib/db'

// GET /api/account/security
// Lightweight account-security snapshot for the Privacy & Security screen.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  if (!dbAvailable) {
    // Degrade gracefully so the page still renders in preview/demo deploys.
    return NextResponse.json({
      email: session.user.email ?? null,
      emailVerified: false,
      hasPassword: false,
      twoFactorEnabled: false,
      createdAt: null,
      source: 'no-db',
    })
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      emailVerified: true,
      passwordHash: true,
      createdAt: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  // Read 2FA state separately so the page still works before the 2FA
  // columns are migrated (prisma db push).
  let twoFactorEnabled = false
  try {
    const tfa = await db.user.findUnique({
      where: { id: session.user.id },
      select: { twoFactorEnabled: true },
    })
    twoFactorEnabled = !!tfa?.twoFactorEnabled
  } catch {
    twoFactorEnabled = false
  }

  return NextResponse.json({
    email: user.email,
    emailVerified: user.emailVerified,
    hasPassword: !!user.passwordHash,
    twoFactorEnabled,
    createdAt: user.createdAt,
    source: 'live',
  })
}
