import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db, dbAvailable } from '@/lib/db'

function makeSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    + '-' + Math.random().toString(36).slice(2, 6)
}

function makeInviteCode() {
  // Short memorable code e.g. "XKCD-8F2A"
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${seg(4)}-${seg(4)}`
}

// GET /api/teams — list teams the current user belongs to
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ teams: [] })
  if (!dbAvailable) return NextResponse.json({ teams: [] })

  const memberships = await db.teamMember.findMany({
    where: { userId: session.user.id },
    include: {
      team: {
        include: {
          members: { include: { user: { select: { id: true, name: true } } } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { user: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  })

  const teams = memberships.map(m => ({
    id:           m.team.id,
    name:         m.team.name,
    inviteCode:   m.team.inviteCode,
    memberCount:  m.team.members.length,
    members:      m.team.members.map(mb => ({ id: mb.user.id, name: mb.user.name, role: mb.role })),
    role:         m.role,
    lastMessage:  m.team.messages[0]
      ? { content: m.team.messages[0].content, senderName: m.team.messages[0].user.name, createdAt: m.team.messages[0].createdAt }
      : null,
    createdAt:    m.team.createdAt,
  }))

  return NextResponse.json({ teams })
}

// POST /api/teams — create a new team
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!dbAvailable) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 })

  const { name, description } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const team = await db.team.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      slug: makeSlug(name.trim()),
      inviteCode: makeInviteCode(),
      members: {
        create: { userId: session.user.id, role: 'OWNER' },
      },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true } } } },
    },
  })

  return NextResponse.json({ team: {
    id:          team.id,
    name:        team.name,
    inviteCode:  team.inviteCode,
    memberCount: team.members.length,
    members:     team.members.map(m => ({ id: m.user.id, name: m.user.name, role: m.role })),
    role:        'OWNER',
    lastMessage: null,
    createdAt:   team.createdAt,
  }}, { status: 201 })
}
