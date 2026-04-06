import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const [contest, slots, picks] = await Promise.all([
    prisma.contest.findUnique({ where: { id }, select: { status: true, draftOpenAt: true, draftCloseAt: true } }),
    prisma.draftSlot.findMany({
      where: { contestId: id },
      orderBy: { pickOrder: 'asc' },
      include: { manager: { select: { id: true, username: true } } },
    }),
    prisma.contestPick.findMany({
      where: { contestId: id },
      include: { manager: { select: { id: true, username: true } } },
    }),
  ])

  const now = new Date()
  const eligibleManagerIds = slots
    .filter((s) => s.eligibleAt <= now && !s.pickedAt)
    .map((s) => s.managerId)

  // Compute live status from the clock so the client doesn't depend on the cron having run.
  let liveStatus = contest?.status ?? null
  if (contest && liveStatus === 'UPCOMING' && now >= contest.draftOpenAt && now < contest.draftCloseAt) {
    liveStatus = 'DRAFTING'
  }

  return NextResponse.json({
    contestId: id,
    status: liveStatus,
    eligibleManagerIds,
    slots: slots.map((s) => ({
      managerId: s.managerId,
      username: s.manager.username,
      pickOrder: s.pickOrder,
      eligibleAt: s.eligibleAt.toISOString(),
      pickedAt: s.pickedAt?.toISOString() ?? null,
    })),
    picks: picks.map((p) => ({
      managerId: p.managerId,
      username: p.manager.username,
      teamCode: p.teamCode,
      pickedAt: p.pickedAt.toISOString(),
    })),
  })
}
