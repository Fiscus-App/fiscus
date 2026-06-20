import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db, dbAvailable } from '@/lib/db'
import { generateSecret, buildOtpAuthUrl } from '@/lib/totp'

// POST /api/account/2fa/setup
// Generates (and stashes) a pending TOTP secret. Returns the provisioning URI
// and a human-readable manual key. The secret is only promoted to "enabled"
// once the user verifies a code via /api/account/2fa/enable.
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  if (!dbAvailable) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }
  if (user.twoFactorEnabled) {
    return NextResponse.json({ error: 'Two-factor authentication is already enabled' }, { status: 400 })
  }

  const secret = generateSecret()
  await db.user.update({
    where: { id: user.id },
    data: { twoFactorPending: secret },
  })

  const otpauthUrl = buildOtpAuthUrl({
    secret,
    accountName: user.email,
    issuer: 'Fiscus',
  })

  // Group the base32 key into 4-char blocks for easier manual entry.
  const manualKey = secret.replace(/(.{4})/g, '$1 ').trim()

  return NextResponse.json({ secret, manualKey, otpauthUrl })
}
