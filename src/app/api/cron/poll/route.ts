import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { pollContest, checkContestStatuses } from '@/lib/savant'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await checkContestStatuses()

    const activeContests = await prisma.contest.findMany({
      where: { status: 'ACTIVE' },
    })

    const results = await Promise.allSettled(
      activeContests.map((c) => pollContest(c.id))
    )

    const succeeded = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    return NextResponse.json({
      polled: activeContests.length,
      succeeded,
      failed,
      errors: results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => r.reason?.message),
    })
  } catch (err) {
    console.error('Cron poll error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
