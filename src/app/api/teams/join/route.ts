import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db, dbAvailable } from '@/lib/db'

// POST /api/teams/join  { code: "XXXX-XXXX" }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!dbAvailable) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 })

  const { code } = await req.json()
  if (!code?.trim()) return NextResponse.json({ error: 'Invite code required' }, { status: 400 })

  const team = await db.team.findUnique({
    where: { inviteCode: code.trim().toUpperCase() },
    include: { members: true },
  })

  if (!team) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })

  // Already a member?
  const already = team.members.find(m => m.userId === session.user.id)
  if (already) return NextResponse.json({ teamId: team.id, alreadyMember: true })

  await db.teamMember.create({
    data: { teamId: team.id, userId: session.user.id, role: 'MEMBER' },
  })

  return NextResponse.json({ teamId: team.id, name: team.name })
}
