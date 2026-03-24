import { prisma } from '@/lib/db'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function DraftIndexPage() {
  const activeContest = await prisma.contest.findFirst({
    where: { status: 'DRAFTING' },
    orderBy: [{ season: 'desc' }, { weekNumber: 'desc' }],
  })

  if (activeContest) {
    redirect(`/draft/${activeContest.id}`)
  }

  const upcomingContest = await prisma.contest.findFirst({
    where: { status: 'UPCOMING' },
    orderBy: { draftOpenAt: 'asc' },
  })

  return (
    <div className="min-h-screen">
      <header className="bg-blue-900 text-white px-4 py-5">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-bold">Draft</h1>
        </div>
      </header>
      <div className="max-w-lg mx-auto px-4 py-8 text-center">
        <p className="text-4xl mb-4">⚾</p>
        {upcomingContest ? (
          <>
            <h2 className="font-bold text-slate-700">No draft open yet</h2>
            <p className="text-slate-500 text-sm mt-2">
              Next draft opens{' '}
              {new Date(upcomingContest.draftOpenAt).toLocaleString()}
            </p>
            <p className="text-slate-400 text-sm">{upcomingContest.name}</p>
          </>
        ) : (
          <>
            <h2 className="font-bold text-slate-700">No draft scheduled</h2>
            <p className="text-slate-500 text-sm mt-2">Check back soon!</p>
          </>
        )}
        <Link href="/" className="inline-block mt-6 text-blue-600 text-sm font-medium">
          ← Back to standings
        </Link>
      </div>
    </div>
  )
}
