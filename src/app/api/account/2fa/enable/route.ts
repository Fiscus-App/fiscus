import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { hash } from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { db, dbAvailable } from '@/lib/db'
import { verifyToken, generateBackupCodes } from '@/lib/totp'

// POST /api/account/2fa/enable
// Body: { token: string }
// Verifies the 6-digit code against the pending secret, enables 2FA, and
// returns one-time backup codes (shown once — stored only as hashes).
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  if (!dbAvailable) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }

  const { token } = await req.json().catch(() => ({}))
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Verification code is required' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }
  if (!user.twoFactorPending) {
    return NextResponse.json({ error: 'Start the setup again — no pending secret found' }, { status: 400 })
  }

  if (!verifyToken(token, user.twoFactorPending)) {
    return NextResponse.json({ error: 'That code is not valid. Check your authenticator and try again.' }, { status: 400 })
  }

  const backupCodes = generateBackupCodes(10)
  const hashedCodes = await Promise.all(backupCodes.map((c) => hash(c, 10)))

  await db.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: true,
      twoFactorSecret: user.twoFactorPending,
      twoFactorPending: null,
      twoFactorBackupCodes: JSON.stringify(hashedCodes),
    },
  })

  return NextResponse.json({ ok: true, backupCodes })
}
