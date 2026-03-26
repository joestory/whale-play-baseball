import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { getTeam } from '@/lib/constants'
import { contestDatesUpToToday } from '@/lib/standings'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await auth()
  const managerId = session!.user.id

  const [currentContest, picks] = await Promise.all([
    prisma.contest.findFirst({
      where: { status: { in: ['DRAFTING', 'ACTIVE'] } },
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
  ])

  const currentPick = picks.find(
    (p) => p.contestId === currentContest?.id
  )

  // Fetch standing data for the per-date breakdown
  const currentStanding = currentPick && currentContest
    ? await prisma.standing.findUnique({
        where: { contestId_managerId: { contestId: currentContest.id, managerId } },
        select: { dailyValues: true, dailyOpponents: true },
      })
    : null

  const contestDates = currentContest
    ? contestDatesUpToToday(currentContest.startDate, currentContest.endDate)
    : []
  const dailyValues = (currentStanding?.dailyValues ?? {}) as Record<string, number>
  const dailyOpponents = (currentStanding?.dailyOpponents ?? {}) as Record<string, string>
  const datesWithData = contestDates.filter((d) => d in dailyValues)

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
                <>
                  <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <span className="text-green-400 text-base">✓</span>
                    <div>
                      <p className="text-sm font-medium text-green-300">Pick submitted</p>
                      <p className="text-sm text-green-500">
                        {getTeam(currentPick.teamCode)?.name ?? currentPick.teamCode}
                      </p>
                    </div>
                  </div>

                  {/* Per-game-date breakdown */}
                  {datesWithData.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {[...datesWithData].reverse().map((date, i, arr) => {
                        const prevDate = arr[i + 1]
                        const cumulative = dailyValues[date] ?? 0
                        const prev = prevDate ? (dailyValues[prevDate] ?? 0) : 0
                        const delta = cumulative - prev
                        const opp = dailyOpponents[date]
                        const oppTeam = opp ? getTeam(opp) : null
                        const label = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })
                        return (
                          <div key={date} className="flex items-center gap-3 text-sm px-1 py-0.5">
                            <span className="text-zinc-500 w-12 shrink-0 text-xs">{label}</span>
                            {oppTeam ? (
                              <span className="flex items-center gap-1.5 flex-1">
                                <img
                                  src={oppTeam.logo}
                                  alt={oppTeam.abbreviation}
                                  className="w-5 h-5 object-contain"
                                />
                                <span className="text-zinc-400 text-xs">{oppTeam.abbreviation}</span>
                              </span>
                            ) : (
                              <span className="flex-1" />
                            )}
                            <span className={`tabular-nums font-medium text-sm ${
                              delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-zinc-600'
                            }`}>
                              {delta > 0 ? '+' : ''}{delta % 1 === 0 ? delta : delta.toFixed(2)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
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
