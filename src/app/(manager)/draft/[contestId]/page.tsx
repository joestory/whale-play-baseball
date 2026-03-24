import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import DraftClient from './DraftClient'

export default async function DraftPage({
  params,
}: {
  params: Promise<{ contestId: string }>
}) {
  const { contestId } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')

  const managerId = session.user.id

  const [contest, slots, picks] = await Promise.all([
    prisma.contest.findUnique({ where: { id: contestId } }),
    prisma.draftSlot.findMany({
      where: { contestId },
      orderBy: { pickOrder: 'asc' },
      include: { manager: { select: { id: true, username: true } } },
    }),
    prisma.contestPick.findMany({
      where: { contestId },
      include: { manager: { select: { id: true, username: true } } },
    }),
  ])

  if (!contest) notFound()

  // Check if manager is in this draft
  const mySlot = slots.find((s) => s.managerId === managerId)
  const myPick = picks.find((p) => p.managerId === managerId)

  return (
    <DraftClient
      contest={{
        id: contest.id,
        name: contest.name,
        metricName: contest.metricName,
        metricDescription: contest.metricDescription,
        status: contest.status,
        draftOpenAt: contest.draftOpenAt.toISOString(),
        draftCloseAt: contest.draftCloseAt.toISOString(),
        cascadeWindowMinutes: contest.cascadeWindowMinutes,
      }}
      managerId={managerId}
      managerUsername={session.user.name ?? ''}
      mySlot={
        mySlot
          ? {
              pickOrder: mySlot.pickOrder,
              eligibleAt: mySlot.eligibleAt.toISOString(),
              pickedAt: mySlot.pickedAt?.toISOString() ?? null,
            }
          : null
      }
      myPick={myPick ? { teamCode: myPick.teamCode } : null}
      initialSlots={slots.map((s) => ({
        managerId: s.managerId,
        username: s.manager.username,
        pickOrder: s.pickOrder,
        eligibleAt: s.eligibleAt.toISOString(),
        pickedAt: s.pickedAt?.toISOString() ?? null,
      }))}
      initialPicks={picks.map((p) => ({
        managerId: p.managerId,
        username: p.manager.username,
        teamCode: p.teamCode,
      }))}
    />
  )
}
