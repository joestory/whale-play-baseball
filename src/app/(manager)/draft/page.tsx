import { prisma } from '@/lib/db'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function DraftIndexPage() {
  const now = new Date()

  // Find any contest currently in its draft window (by time, not just DB status)
  const activeContest = await prisma.contest.findFirst({
    where: {
      hidden: false,
      status: { in: ['DRAFTING', 'UPCOMING'] },
      draftOpenAt: { lte: now },
      draftCloseAt: { gt: now },
    },
    orderBy: [{ season: 'desc' }, { contestNumber: 'desc' }],
  })

  if (activeContest) {
    redirect(`/draft/${activeContest.id}`)
  }

  const upcomingContest = await prisma.contest.findFirst({
    where: { status: 'UPCOMING', hidden: false, draftOpenAt: { gt: now } },
    orderBy: { draftOpenAt: 'asc' },
  })

  return (
    <div className="max-w-lg mx-auto px-4 py-12 text-center">
      <p className="text-4xl mb-4 opacity-20">⚾</p>
      {upcomingContest ? (
        <>
          <h2 className="font-semibold text-zinc-300">No draft open yet</h2>
          <p className="text-zinc-500 text-sm mt-2">
            Next draft opens{' '}
            {new Date(upcomingContest.draftOpenAt).toLocaleString('en-US', {
              timeZone: 'America/Los_Angeles',
              month: 'numeric',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              timeZoneName: 'short',
            })}
          </p>
          <p className="text-zinc-600 text-sm">{upcomingContest.name}</p>
        </>
      ) : (
        <>
          <h2 className="font-semibold text-zinc-300">No draft scheduled</h2>
          <p className="text-zinc-500 text-sm mt-2">Check back soon!</p>
        </>
      )}
      <Link href="/" className="inline-block mt-6 text-green-400 hover:text-green-300 text-sm font-medium transition-colors">
        ← Back to standings
      </Link>
    </div>
  )
}
