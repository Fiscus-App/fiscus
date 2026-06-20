import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { compare } from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { db, dbAvailable } from '@/lib/db'
import { verifyToken } from '@/lib/totp'

// POST /api/account/2fa/disable
// Body: { password?: string, token?: string }
// Requires re-verification: the account password (if set) OR a current TOTP
// code OR an unused backup code.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  if (!dbAvailable) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }

  const { password, token } = await req.json().catch(() => ({}))

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }
  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    return NextResponse.json({ error: 'Two-factor authentication is not enabled' }, { status: 400 })
  }

  let verified = false

  // 1) Password (for password accounts)
  if (!verified && user.passwordHash && password && typeof password === 'string') {
    verified = await compare(password, user.passwordHash)
  }

  // 2) Current TOTP code
  if (!verified && token && typeof token === 'string') {
    verified = verifyToken(token, user.twoFactorSecret)
  }

  // 3) Unused backup code
  if (!verified && token && typeof token === 'string' && user.twoFactorBackupCodes) {
    try {
      const hashes: string[] = JSON.parse(user.twoFactorBackupCodes)
      for (const h of hashes) {
        if (await compare(token.trim(), h)) { verified = true; break }
      }
    } catch { /* ignore malformed */ }
  }

  if (!verified) {
    return NextResponse.json(
      { error: 'Enter your password or a current authenticator code to disable 2FA' },
      { status: 400 },
    )
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorPending: null,
      twoFactorBackupCodes: null,
    },
  })

  return NextResponse.json({ ok: true })
}
