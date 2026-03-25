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
      <header className="bg-[#0a0a0a] border-b border-[#1f1f1f] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/" className="text-zinc-500 hover:text-zinc-300 text-xl transition-colors">←</Link>
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
          {contest.metricDescription && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Description</span>
              <span className="text-right max-w-[200px] text-zinc-300">{contest.metricDescription}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Period</span>
            <span className="font-medium text-zinc-200">
              {new Date(contest.startDate).toLocaleDateString()} –{' '}
              {new Date(contest.endDate).toLocaleDateString()}
            </span>
          </div>
          {contest.lastPolledAt && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Last updated</span>
              <span className="text-zinc-600">
                {new Date(contest.lastPolledAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Standings */}
        <section>
          <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Standings
          </h2>
          {contest.standings.length > 0 ? (
            <div className="space-y-2">
              {contest.standings.map((s) => {
                const team = getTeam(s.teamCode)
                return (
                  <div
                    key={s.id}
                    className="bg-[#111111] rounded-xl border border-[#1f1f1f] px-4 py-3 flex items-center gap-3"
                  >
                    <span className="text-xl font-bold text-zinc-700 w-8 text-center tabular-nums">
                      {s.rank ?? '—'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-100 truncate">
                        {s.manager.username}
                      </p>
                      <p className="text-xs text-zinc-500">{team?.name ?? s.teamCode}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-400 tabular-nums">
                        {s.metricValue.toFixed(s.metricValue % 1 === 0 ? 0 : 2)}
                      </p>
                      <p className="text-xs text-zinc-600">{contest.metricName}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-[#111111] rounded-xl border border-[#1f1f1f] p-6 text-center text-zinc-600">
              No standings yet
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
