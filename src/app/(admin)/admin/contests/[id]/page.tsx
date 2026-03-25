import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import ContestAdminClient from './ContestAdminClient'

export default async function AdminContestPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [contest, allManagers] = await Promise.all([
    prisma.contest.findUnique({
      where: { id },
      include: {
        draftSlots: {
          orderBy: { pickOrder: 'asc' },
          include: { manager: { select: { id: true, username: true } } },
        },
        picks: { include: { manager: { select: { id: true, username: true } } } },
        standings: {
          orderBy: { rank: 'asc' },
          include: { manager: { select: { id: true, username: true } } },
        },
      },
    }),
    prisma.manager.findMany({
      orderBy: { username: 'asc' },
      select: { id: true, username: true, isAdmin: true },
    }),
  ])

  if (!contest) notFound()

  return (
    <ContestAdminClient
      contest={{
        id: contest.id,
        name: contest.name,
        weekNumber: contest.weekNumber,
        season: contest.season,
        metricName: contest.metricName,
        metricDescription: contest.metricDescription ?? '',
        status: contest.status,
        savantCsvUrl: contest.savantCsvUrl,
        metricConfig: JSON.stringify(contest.metricConfig, null, 2),
        lastPolledAt: contest.lastPolledAt?.toISOString() ?? null,
        startDate: contest.startDate.toISOString().slice(0, 16),
        endDate: contest.endDate.toISOString().slice(0, 16),
        draftOpenAt: contest.draftOpenAt.toISOString().slice(0, 16),
        draftCloseAt: contest.draftCloseAt.toISOString().slice(0, 16),
        cascadeWindowMinutes: contest.cascadeWindowMinutes,
      }}
      draftSlots={contest.draftSlots.map((s) => ({
        managerId: s.managerId,
        username: s.manager.username,
        pickOrder: s.pickOrder,
        pickedAt: s.pickedAt?.toISOString() ?? null,
      }))}
      picks={contest.picks.map((p) => ({
        managerId: p.managerId,
        username: p.manager.username,
        teamCode: p.teamCode,
      }))}
      standings={contest.standings.map((s) => ({
        managerId: s.managerId,
        username: s.manager.username,
        teamCode: s.teamCode,
        metricValue: s.metricValue,
        rank: s.rank,
      }))}
      allManagers={allManagers}
    />
  )
}
