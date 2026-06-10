import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/verify-email?error=missing', req.url))
  }

  const user = await db.user.findUnique({
    where: { verificationToken: token },
  })

  if (!user) {
    return NextResponse.redirect(new URL('/verify-email?error=invalid', req.url))
  }

  if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
    return NextResponse.redirect(new URL('/verify-email?error=expired', req.url))
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
    },
  })

  return NextResponse.redirect(new URL('/verify-email?success=1', req.url))
}
