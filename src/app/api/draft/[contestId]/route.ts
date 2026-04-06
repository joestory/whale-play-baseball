import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { Prisma } from '@/generated/prisma/client'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contestId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { contestId } = await params
  const body = await req.json()
  const { teamCode } = body as { teamCode?: string }

  if (!teamCode) {
    return NextResponse.json({ error: 'teamCode is required' }, { status: 400 })
  }

  const managerId = session.user.id

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Verify contest draft window is open based on time, not cached DB status.
      // This lets managers pick even if the cron hasn't flipped the status yet.
      const contest = await tx.contest.findUniqueOrThrow({ where: { id: contestId } })
      const now = new Date()
      const draftIsOpen = now >= contest.draftOpenAt && now < contest.draftCloseAt
      if (!draftIsOpen) {
        throw new Error('Draft is not open')
      }
      // Opportunistically sync the DB status so the cron isn't the only mechanism.
      if (contest.status === 'UPCOMING') {
        await tx.contest.update({ where: { id: contestId }, data: { status: 'DRAFTING' } })
      }

      // Verify manager is eligible (has an open slot that has become eligible)
      const slot = await tx.draftSlot.findUnique({
        where: { contestId_managerId: { contestId, managerId } },
      })
      if (!slot) {
        throw new Error('You are not in the draft for this contest')
      }
      if (slot.pickedAt) {
        throw new Error('You have already made your pick')
      }
      if (slot.eligibleAt > new Date()) {
        throw new Error('Your draft window has not opened yet')
      }

      // Create the pick (will throw on unique constraint if team already taken)
      const pick = await tx.contestPick.create({
        data: { contestId, managerId, teamCode },
      })

      // Mark the draft slot as picked
      await tx.draftSlot.update({
        where: { id: slot.id },
        data: { pickedAt: new Date() },
      })

      // Create initial standing row with 0 value (poll will fill it in)
      await tx.standing.upsert({
        where: { contestId_managerId: { contestId, managerId } },
        create: { contestId, managerId, teamCode, metricValue: 0 },
        update: { teamCode, metricValue: 0 },
      })

      return pick
    })

    return NextResponse.json(result)
  } catch (err) {
    // Unique constraint on (contestId, teamCode) — race condition, team was just taken
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json(
        { error: 'That team was just taken — please pick another' },
        { status: 409 }
      )
    }
    const message = err instanceof Error ? err.message : 'Failed to submit pick'
    const status = message === 'Unauthorized' ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
