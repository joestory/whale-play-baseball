import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { getTeam } from '@/lib/constants'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await auth()
  const managerId = session!.user.id

  const [currentContest, picks, myStandings] = await Promise.all([
    prisma.contest.findFirst({
      where: { status: { in: ['DRAFTING', 'ACTIVE'] }, hidden: false },
      orderBy: [{ season: 'desc' }, { weekNumber: 'desc' }],
    }),
    prisma.contestPick.findMany({
      where: { managerId },
      orderBy: { pickedAt: 'desc' },
      include: {
        contest: {
          select: {
            id: true,
            name: true,
            metricName: true,
            weekNumber: true,
            season: true,
            status: true,
          },
        },
      },
    }),
    prisma.standing.findMany({
      where: { managerId },
      select: { contestId: true, rank: true, metricValue: true },
    }),
  ])

  const standingByContest = new Map(myStandings.map((s) => [s.contestId, s]))

  function fmtVal(v: number) {
    return v % 1 === 0 ? String(v) : v.toFixed(2)
  }

  const currentPick = picks.find(
    (p) => p.contestId === currentContest?.id
  )

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Current contest status */}
      {currentContest && (
        <section>
          <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Current Contest
          </h2>
          <div className="bg-[#111111] rounded-xl border border-[#1f1f1f] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white">{currentContest.name}</p>
                <p className="text-sm text-zinc-500">{currentContest.metricName}</p>
              </div>
              <span className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
                currentContest.status === 'DRAFTING'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-green-500/10 text-green-400 border border-green-500/20'
              }`}>
                {currentContest.status === 'DRAFTING' ? 'Draft Open' : 'Live'}
              </span>
            </div>

            <div className="mt-4">
              {currentPick ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <span className="text-green-400 text-base">✓</span>
                    <div>
                      <p className="text-sm font-medium text-green-300">Pick submitted</p>
                      <p className="text-sm text-green-500">
                        {getTeam(currentPick.teamCode)?.name ?? currentPick.teamCode}
                      </p>
                    </div>
                  </div>
                  {standingByContest.has(currentContest.id) && (() => {
                    const s = standingByContest.get(currentContest.id)!
                    return (
                      <div className="flex items-center gap-2 px-1 text-sm">
                        <span className="text-zinc-500">Rank</span>
                        <span className="font-semibold text-zinc-200">#{s.rank}</span>
                        <span className="text-zinc-700">·</span>
                        <span className="tabular-nums text-zinc-200">{fmtVal(s.metricValue)}</span>
                        <span className="text-zinc-500">{currentContest.metricName}</span>
                      </div>
                    )
                  })()}
                </div>
              ) : currentContest.status === 'DRAFTING' ? (
                <Link
                  href={`/draft/${currentContest.id}`}
                  className="block w-full text-center bg-green-500 hover:bg-green-400 text-black font-semibold rounded-lg py-3 transition-colors"
                >
                  Make Your Pick →
                </Link>
              ) : (
                <p className="text-sm text-zinc-600 text-center">No pick made</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Pick history */}
      <section>
        <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          Pick History
        </h2>
        {picks.length > 0 ? (
          <div className="space-y-2">
            {picks.map((pick) => (
              <Link
                key={pick.id}
                href={`/contest/${pick.contestId}`}
                className="block bg-[#111111] rounded-xl border border-[#1f1f1f] px-4 py-3 hover:bg-[#1a1a1a] transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-100 truncate">{pick.contest.name}</p>
                    <p className="text-xs text-zinc-500">
                      {getTeam(pick.teamCode)?.name ?? pick.teamCode} ·{' '}
                      {pick.contest.metricName}
                    </p>
                    {standingByContest.has(pick.contestId) && (() => {
                      const s = standingByContest.get(pick.contestId)!
                      return (
                        <p className="text-xs text-zinc-400 tabular-nums mt-0.5">
                          #{s.rank} · {fmtVal(s.metricValue)} {pick.contest.metricName}
                        </p>
                      )
                    })()}
                  </div>
                  <span className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${
                    pick.contest.status === 'COMPLETED'
                      ? 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                      : 'bg-green-500/10 text-green-400 border border-green-500/20'
                  }`}>
                    {pick.contest.status === 'COMPLETED' ? 'Final' : 'Live'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-[#111111] rounded-xl border border-[#1f1f1f] p-6 text-center text-zinc-600">
            No picks yet
          </div>
        )}
      </section>
    </div>
  )
}
