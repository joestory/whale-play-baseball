import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

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
      // Verify contest is in DRAFTING status
      const contest = await tx.contest.findUniqueOrThrow({ where: { id: contestId } })
      if (contest.status !== 'DRAFTING') {
        throw new Error('Draft is not open')
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
    const message = err instanceof Error ? err.message : 'Failed to submit pick'
    const status = message === 'Unauthorized' ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
