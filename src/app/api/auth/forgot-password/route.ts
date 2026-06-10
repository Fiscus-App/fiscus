import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  })

  // Always return success to prevent email enumeration
  if (!user) {
    return NextResponse.json({ ok: true })
  }

  const resetToken = randomBytes(32).toString('hex')
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await db.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExpiry },
  })

  sendPasswordResetEmail(user.email, resetToken).catch((e) =>
    console.error('[forgot-password] email send failed:', e)
  )

  return NextResponse.json({ ok: true })
}
