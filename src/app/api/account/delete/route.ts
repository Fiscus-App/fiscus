import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { compare } from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { db, dbAvailable } from '@/lib/db'

// POST /api/account/delete
// Body: { password?: string, confirm: boolean }
// Permanently deletes the signed-in user. All related rows (follows, saves,
// votes, watch history, team memberships, messages) cascade via the schema.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  if (!dbAvailable) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }

  const { password, confirm } = await req.json().catch(() => ({}))

  if (confirm !== true) {
    return NextResponse.json({ error: 'Deletion not confirmed' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  // Password-based accounts must re-enter their password to delete.
  if (user.passwordHash) {
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required to delete your account' }, { status: 400 })
    }
    const valid = await compare(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Password is incorrect' }, { status: 400 })
    }
  }

  await db.user.delete({ where: { id: user.id } })

  return NextResponse.json({ ok: true })
}
