import { prisma } from '@/lib/db'
import { getTeam } from '@/lib/constants'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const revalidate = 300

export default async function ContestPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const contest = await prisma.contest.findUnique({
    where: { id },
    include: {
      standings: {
        orderBy: { rank: 'asc' },
        include: { manager: { select: { id: true, username: true } } },
      },
    },
  })

  if (!contest) notFound()

  const statusLabel: Record<string, string> = {
    UPCOMING: 'Upcoming',
    DRAFTING: 'Draft Open',
    ACTIVE: 'Live',
    COMPLETED: 'Final',
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="bg-blue-900 text-white px-4 py-4 sticky top-0 z-10 shadow-md">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/" className="text-white/70 hover:text-white text-xl">←</Link>
          <div>
            <h1 className="font-bold">{contest.name}</h1>
            <p className="text-xs text-blue-200">{statusLabel[contest.status]}</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Contest info */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Metric</span>
            <span className="font-medium">{contest.metricName}</span>
          </div>
          {contest.metricDescription && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Description</span>
              <span className="text-right max-w-[200px]">{contest.metricDescription}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Period</span>
            <span className="font-medium">
              {new Date(contest.startDate).toLocaleDateString()} –{' '}
              {new Date(contest.endDate).toLocaleDateString()}
            </span>
          </div>
          {contest.lastPolledAt && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Last updated</span>
              <span className="text-slate-400">
                {new Date(contest.lastPolledAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Standings */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Standings
          </h2>
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
                      <p className="text-xs text-slate-500">{team?.name ?? s.teamCode}</p>
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
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400">
              No standings yet
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
