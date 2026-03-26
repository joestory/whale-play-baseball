import { prisma } from '@/lib/db'
import { getTeam } from '@/lib/constants'
import Link from 'next/link'
import { auth } from '@/auth'
import MobileNav from '@/components/layout/MobileNav'
import AdminNav from '@/components/layout/AdminNav'
import TopNav from '@/components/layout/TopNav'
import Countdown from '@/components/Countdown'
import ContestView from '@/components/ContestView'
import type { StandingRow } from '@/types'

export const dynamic = 'force-dynamic'

function contestDatesUpToToday(startDate: Date, endDate: Date): string[] {
  const today = new Date().toISOString().slice(0, 10)
  const dates: string[] = []
  const cursor = new Date(startDate)
  while (cursor <= endDate) {
    const d = cursor.toISOString().slice(0, 10)
    if (d > today) break
    dates.push(d)
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

async function getContestData() {
  const active = await prisma.contest.findFirst({
    where: { status: { in: ['DRAFTING', 'ACTIVE'] } },
    orderBy: [{ season: 'desc' }, { weekNumber: 'desc' }],
    include: {
      standings: {
        orderBy: { rank: 'asc' },
        include: { manager: { select: { id: true, username: true, icon: true } } },
      },
      picks: { select: { managerId: true } },
    },
  })
  if (active) return { contest: active, upcoming: null }

  const upcoming = await prisma.contest.findFirst({
    where: { status: 'UPCOMING' },
    orderBy: [{ season: 'desc' }, { weekNumber: 'desc' }],
    select: { id: true, name: true, weekNumber: true, season: true, metricName: true, metricDescription: true, commissionerMessage: true, sweepstakesPhoto: true, draftOpenAt: true },
  })
  return { contest: null, upcoming }
}

export default async function HomePage() {
  const [session, { contest, upcoming }] = await Promise.all([
    auth(),
    getContestData(),
  ])

  const isLoggedIn = !!session?.user
  const isAdmin = session?.user?.isAdmin ?? false

  let standingRows: StandingRow[] = []
  let contestDates: string[] = []

  if (contest) {
    contestDates = contestDatesUpToToday(contest.startDate, contest.endDate)
    const dateSet = new Set(contestDates)
    const pickedManagerIds = new Set(contest.picks.map((p) => p.managerId))
    standingRows = contest.standings.filter((s) => pickedManagerIds.has(s.managerId)).map((s) => {
      const team = getTeam(s.teamCode)
      const raw = (s.dailyValues ?? {}) as Record<string, number>
      return {
        id: s.id,
        rank: s.rank,
        managerIcon: s.manager.icon ?? '⚾',
        managerUsername: s.manager.username,
        teamCode: s.teamCode,
        teamName: team?.name ?? s.teamCode,
        teamLogo: team?.logo ?? '',
        metricValue: s.metricValue,
        dailyValues: Object.fromEntries(Object.entries(raw).filter(([d]) => dateSet.has(d))),
        relatedValues: (s.relatedValues ?? {}) as Record<string, number>,
      }
    })
  }

  return (
    <div className={`min-h-screen pt-14 ${isLoggedIn ? 'pb-[max(5rem,calc(5rem+env(safe-area-inset-bottom)))]' : 'pb-6'}`}>
      <TopNav />

      <div className="max-w-lg mx-auto px-4 pt-8 pb-6 space-y-4">
        {contest ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                {contest.status === 'DRAFTING' ? (
                  <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Draft Open
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Live
                  </span>
                )}
                <h2 className="text-xl font-semibold text-white mt-2">{contest.name}</h2>
                <p className="text-sm text-zinc-500">{contest.metricName}</p>
              </div>
              {isLoggedIn && !isAdmin && contest.status === 'DRAFTING' && (
                <Link
                  href={`/draft/${contest.id}`}
                  className="flex-shrink-0 bg-green-500 hover:bg-green-400 text-black text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
                >
                  Pick →
                </Link>
              )}
            </div>

            <ContestView
              status={contest.status}
              standingRows={standingRows}
              contestDates={contestDates}
              metricName={contest.metricName}
              sweepstakesDescription={contest.metricDescription ?? null}
              sweepstakesPhoto={contest.sweepstakesPhoto ?? null}
            />
          </>
        ) : upcoming ? (
          <div className="space-y-4">
            <div className="bg-[#111111] rounded-xl border border-[#1f1f1f] p-6 text-center space-y-3">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Next Contest</p>
              <h2 className="text-xl font-semibold text-white">{upcoming.name}</h2>
              <p className="text-sm text-zinc-500">{upcoming.metricName}</p>
              <p className="text-sm font-medium text-zinc-400">Draft opens in</p>
              <Countdown target={upcoming.draftOpenAt.toISOString()} />
            </div>
            {upcoming.commissionerMessage && (
              <div className="bg-[#111111] rounded-xl border border-[#1f1f1f] px-4 py-3">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Commissioner</p>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{upcoming.commissionerMessage}</p>
              </div>
            )}
            {(upcoming.metricDescription || upcoming.sweepstakesPhoto) && (
              <div className="bg-[#111111] rounded-xl border border-[#1f1f1f] overflow-hidden">
                {upcoming.sweepstakesPhoto && (
                  <img src={upcoming.sweepstakesPhoto} alt="Sweepstakes" className="w-full object-cover" />
                )}
                {upcoming.metricDescription && (
                  <p className="px-4 py-3 text-sm text-zinc-300">{upcoming.metricDescription}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#111111] rounded-xl border border-[#1f1f1f] p-8 text-center">
            <p className="text-zinc-500">No active contest right now.</p>
            <p className="text-zinc-600 text-sm mt-1">Check back soon!</p>
          </div>
        )}
      </div>

      {isLoggedIn && (isAdmin ? <AdminNav /> : <MobileNav />)}
    </div>
  )
}
