import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const contest = await prisma.contest.findUnique({
    where: { id },
    select: { lastPolledAt: true, hidden: true },
  })

  if (!contest || contest.hidden) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const standings = await prisma.standing.findMany({
    where: { contestId: id },
    orderBy: { rank: 'asc' },
    include: {
      manager: { select: { id: true, username: true, icon: true } },
    },
  })

  return NextResponse.json({
    standings,
    lastPolledAt: contest.lastPolledAt?.toISOString() ?? null,
  })
}
