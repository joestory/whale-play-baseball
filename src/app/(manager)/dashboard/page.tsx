import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { getTeam } from '@/lib/constants'
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

  return (
    <div>
      <header className="bg-blue-900 text-white px-4 py-5">
        <div className="max-w-lg mx-auto">
          <p className="text-blue-200 text-sm">Welcome back,</p>
          <h1 className="text-xl font-bold">{session!.user.name}</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Current contest status */}
        {currentContest && (
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Current Contest
            </h2>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-slate-800">{currentContest.name}</p>
                  <p className="text-sm text-slate-500">{currentContest.metricName}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  currentContest.status === 'DRAFTING'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {currentContest.status === 'DRAFTING' ? 'Draft Open' : 'Live'}
                </span>
              </div>

              <div className="mt-4">
                {currentPick ? (
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100">
                    <span className="text-green-600 text-xl">✓</span>
                    <div>
                      <p className="text-sm font-medium text-green-800">Pick submitted</p>
                      <p className="text-sm text-green-600">
                        {getTeam(currentPick.teamCode)?.name ?? currentPick.teamCode}
                      </p>
                    </div>
                  </div>
                ) : currentContest.status === 'DRAFTING' ? (
                  <Link
                    href={`/draft/${currentContest.id}`}
                    className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3 transition-colors"
                  >
                    Make Your Pick →
                  </Link>
                ) : (
                  <p className="text-sm text-slate-400 text-center">No pick made</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Pick history */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Pick History
          </h2>
          {picks.length > 0 ? (
            <div className="space-y-2">
              {picks.map((pick) => (
                <Link
                  key={pick.id}
                  href={`/contest/${pick.contestId}`}
                  className="block bg-white rounded-xl border border-slate-200 px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">{pick.contest.name}</p>
                      <p className="text-xs text-slate-500">
                        {getTeam(pick.teamCode)?.name ?? pick.teamCode} ·{' '}
                        {pick.contest.metricName}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      pick.contest.status === 'COMPLETED'
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {pick.contest.status === 'COMPLETED' ? 'Final' : 'Live'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-400">
              No picks yet
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
