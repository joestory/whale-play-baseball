import { cache } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { contestDatesUpToToday, toStandingRows } from '@/lib/standings'
import StandingsClient from './StandingsClient'

// ISR: revalidate every 5 minutes — standings update nightly so even 300s is fine
export const revalidate = 300

// Cached per render — shared between generateMetadata and ContestPage
const getContest = cache(async (id: string) => {
  return prisma.contest.findUnique({
    where: { id },
    include: {
      standings: {
        orderBy: { rank: 'asc' },
        include: { manager: { select: { id: true, username: true, icon: true } } },
      },
      picks: { select: { managerId: true } },
    },
  })
})

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const contest = await getContest(id)
  if (!contest) return { title: 'Contest not found' }

  const leader = contest.standings[0]
  const description = leader
    ? `Leader: ${leader.manager.username} with ${leader.metricValue.toFixed(leader.metricValue % 1 === 0 ? 0 : 2)} ${contest.metricName}`
    : `${contest.metricName} — standings update nightly`

  return {
    title: `${contest.name} — Week ${contest.contestNumber} Standings`,
    description,
    openGraph: {
      title: `${contest.name} — Week ${contest.contestNumber} Standings`,
      description,
      siteName: 'Whale Play Baseball',
    },
  }
}

export default async function ContestPage({ params }: Props) {
  const { id } = await params
  const contest = await getContest(id)
  if (!contest) notFound()

  const contestDates = contestDatesUpToToday(contest.startDate, contest.endDate)
  const pickedManagerIds = new Set(contest.picks.map((p) => p.managerId))
  const initialStandings = toStandingRows(
    contest.standings.filter((s) => pickedManagerIds.has(s.managerId)),
    contestDates,
  )

  const statusLabel: Record<string, string> = {
    UPCOMING: 'Upcoming',
    DRAFTING: 'Draft Open',
    ACTIVE: 'Live',
    COMPLETED: 'Final',
  }

  const teamSide: 'batting' | 'pitching' | undefined = (() => {
    try {
      const cfg = contest.metricConfig as { teamSide?: 'batting' | 'pitching' }
      return cfg?.teamSide
    } catch { return undefined }
  })()

  return (
    <div className="min-h-screen pb-24">
      <header className="bg-[#0a0a0a] border-b border-[#1f1f1f] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/" className="text-zinc-500 hover:text-zinc-300 text-xl transition-colors">
            ←
          </Link>
          <div>
            <h1 className="font-semibold text-white">{contest.name}</h1>
            <p className="text-xs text-zinc-500">{statusLabel[contest.status]}</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Contest info */}
        <div className="bg-[#111111] rounded-xl border border-[#1f1f1f] p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Metric</span>
            <span className="font-medium text-zinc-200">{contest.metricName}</span>
          </div>
          {teamSide && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Attributed to</span>
              <span className="font-medium text-zinc-200">
                {teamSide === 'batting' ? 'Batting Team' : 'Pitching Team'}
              </span>
            </div>
          )}
          {contest.metricDescription && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Description</span>
              <span className="text-right max-w-[200px] text-zinc-300">
                {contest.metricDescription}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Period</span>
            <span className="font-medium text-zinc-200">
              {new Date(contest.startDate).toLocaleDateString()} –{' '}
              {new Date(contest.endDate).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Standings — client component handles polling, sparklines, share */}
        <StandingsClient
          contestId={contest.id}
          contestStatus={contest.status}
          metricName={contest.metricName}
          initialLastPolledAt={contest.lastPolledAt?.toISOString() ?? null}
          initialStandings={initialStandings}
          contestDates={contestDates}
          contestEndDate={contest.endDate.toISOString().slice(0, 10)}
          pdxFirst={contest.pdxFirst}
        />

        {/* Metric explainer — editorial story authored by the commissioner */}
        {contest.metricExplainer && (
          <div className="bg-[#111111] rounded-xl border border-[#1f1f1f] p-4">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">About This Week&apos;s Metric</h2>
            <p className="text-sm text-zinc-300 whitespace-pre-wrap">{contest.metricExplainer}</p>
          </div>
        )}

      </div>
    </div>
  )
}
