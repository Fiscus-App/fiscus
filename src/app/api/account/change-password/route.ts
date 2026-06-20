import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { compare, hash } from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { db, dbAvailable } from '@/lib/db'

// POST /api/account/change-password
// Body: { currentPassword?: string, newPassword: string }
// For OAuth-only accounts (no existing password) this sets a password without
// requiring the current one.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  if (!dbAvailable) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }

  const { currentPassword, newPassword } = await req.json().catch(() => ({}))

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  // If the account already has a password, verify the current one first.
  if (user.passwordHash) {
    if (!currentPassword || typeof currentPassword !== 'string') {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
    }
    const valid = await compare(currentPassword, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }
    const same = await compare(newPassword, user.passwordHash)
    if (same) {
      return NextResponse.json({ error: 'New password must be different' }, { status: 400 })
    }
  }

  const passwordHash = await hash(newPassword, 12)
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpiry: null },
  })

  return NextResponse.json({ ok: true })
}
