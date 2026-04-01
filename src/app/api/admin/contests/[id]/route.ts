import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { autoSetDraftOrderFromPriorStandings } from '@/lib/draft'
import { deriveContestStatus } from '@/lib/savant'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.isAdmin) throw new Error('Forbidden')
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const contest = await prisma.contest.findUnique({
    where: { id },
    include: {
      draftSlots: {
        orderBy: { pickOrder: 'asc' },
        include: { manager: { select: { id: true, username: true } } },
      },
      picks: { include: { manager: { select: { id: true, username: true } } } },
      standings: { include: { manager: { select: { id: true, username: true } } } },
    },
  })

  if (!contest) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(contest)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  try {
    await prisma.$transaction([
      prisma.standing.deleteMany({ where: { contestId: id } }),
      prisma.contestPick.deleteMany({ where: { contestId: id } }),
      prisma.draftSlot.deleteMany({ where: { contestId: id } }),
      prisma.contest.delete({ where: { id } }),
    ])
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete contest'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  const updateData: Record<string, unknown> = {}
  if (body.name !== undefined) updateData.name = body.name
  if (body.metricName !== undefined) updateData.metricName = body.metricName
  if (body.metricDescription !== undefined) updateData.metricDescription = body.metricDescription
  if (body.commissionerMessage !== undefined) updateData.commissionerMessage = body.commissionerMessage
  if (body.metricExplainer !== undefined) updateData.metricExplainer = body.metricExplainer
  if (body.savantCsvUrl !== undefined) updateData.savantCsvUrl = body.savantCsvUrl
  if (body.metricConfig !== undefined) updateData.metricConfig = body.metricConfig
  if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate)
  if (body.endDate !== undefined) updateData.endDate = new Date(body.endDate)
  if (body.draftOpenAt !== undefined) updateData.draftOpenAt = new Date(body.draftOpenAt)
  if (body.draftCloseAt !== undefined) updateData.draftCloseAt = new Date(body.draftCloseAt)
  if (body.cascadeWindowMinutes !== undefined) updateData.cascadeWindowMinutes = Number(body.cascadeWindowMinutes)
  if (body.status !== undefined) updateData.status = body.status
  if (body.hidden !== undefined) updateData.hidden = body.hidden
  if (body.sweepstakesPhoto !== undefined) updateData.sweepstakesPhoto = body.sweepstakesPhoto

  const draftOpenAtChanged = body.draftOpenAt !== undefined
  const datesChanged =
    body.startDate !== undefined ||
    body.endDate !== undefined ||
    body.draftOpenAt !== undefined ||
    body.draftCloseAt !== undefined

  try {
    const contest = await prisma.contest.update({ where: { id }, data: updateData })

    if (datesChanged && body.status === undefined) {
      // Recompute status from the updated dates so it always reflects the current
      // position in the contest lifecycle (including the day-after rule for COMPLETED).
      const derivedStatus = deriveContestStatus({
        draftOpenAt: contest.draftOpenAt,
        draftCloseAt: contest.draftCloseAt,
        endDate: contest.endDate,
      })
      if (derivedStatus !== contest.status) {
        await prisma.contest.update({
          where: { id },
          data: { status: derivedStatus },
        })
        contest.status = derivedStatus
      }
    }

    if (draftOpenAtChanged) {
      await autoSetDraftOrderFromPriorStandings(id)
    }
    return NextResponse.json(contest)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update contest'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
