import { prisma } from '@/lib/db'
import { getTeam } from '@/lib/constants'
import Link from 'next/link'

export const revalidate = 300 // refresh every 5 minutes

async function getCurrentContest() {
  return prisma.contest.findFirst({
    where: { status: { in: ['DRAFTING', 'ACTIVE'] } },
    orderBy: [{ season: 'desc' }, { weekNumber: 'desc' }],
    include: {
      standings: {
        orderBy: { rank: 'asc' },
        include: { manager: { select: { id: true, username: true } } },
      },
    },
  })
}

async function getRecentContests() {
  return prisma.contest.findMany({
    where: { status: 'COMPLETED' },
    orderBy: [{ season: 'desc' }, { weekNumber: 'desc' }],
    take: 5,
    select: { id: true, name: true, weekNumber: true, season: true, metricName: true },
  })
}

export default async function HomePage() {
  const [contest, recentContests] = await Promise.all([
    getCurrentContest(),
    getRecentContests(),
  ])

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="bg-blue-900 text-white px-4 py-5 sticky top-0 z-10 shadow-md">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">⚾ Whale Play Baseball</h1>
          <Link
            href="/login"
            className="text-sm bg-white/20 hover:bg-white/30 rounded-full px-4 py-1.5 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {contest ? (
          <>
            {/* Current contest */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    {contest.status === 'DRAFTING' ? 'Draft Open' : 'Live Contest'}
                  </p>
                  <h2 className="text-lg font-bold text-slate-800">{contest.name}</h2>
                  <p className="text-sm text-slate-500">Metric: {contest.metricName}</p>
                </div>
                <Link
                  href={`/contest/${contest.id}`}
                  className="text-sm text-blue-600 font-medium"
                >
                  Details →
                </Link>
              </div>

              {contest.status === 'DRAFTING' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-center">
                  <p className="text-amber-800 font-medium text-sm">
                    🏈 Draft is open — sign in to make your pick!
                  </p>
                </div>
              )}

              {/* Standings */}
              {contest.standings.length > 0 ? (
                <div className="space-y-2">
                  {contest.standings.map((s) => {
                    const team = getTeam(s.teamCode)
                    return (
                      <div
                        key={s.id}
                        className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3"
                      >
                        <span className="text-2xl font-bold text-slate-300 w-8 text-center">
                          {s.rank ?? '—'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 truncate">
                            {s.manager.username}
                          </p>
                          <p className="text-xs text-slate-500">
                            {team?.name ?? s.teamCode}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-blue-700">
                            {s.metricValue.toFixed(s.metricValue % 1 === 0 ? 0 : 2)}
                          </p>
                          <p className="text-xs text-slate-400">{contest.metricName}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
                  <p>Standings will appear after picks are made</p>
                </div>
              )}
            </section>
          </>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-slate-500">No active contest right now.</p>
            <p className="text-slate-400 text-sm mt-1">Check back soon!</p>
          </div>
        )}

        {/* Past contests */}
        {recentContests.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Past Contests
            </h3>
            <div className="space-y-2">
              {recentContests.map((c) => (
                <Link
                  key={c.id}
                  href={`/contest/${c.id}`}
                  className="block bg-white rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <p className="font-medium text-slate-800">{c.name}</p>
                  <p className="text-xs text-slate-500">
                    Week {c.weekNumber} · {c.season} · {c.metricName}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
