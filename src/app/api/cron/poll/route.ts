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
      select: { id: true, name: true },
    })

    if (activeContests.length === 0) {
      console.log('[cron/poll] No active contests to poll')
      return NextResponse.json({ polled: 0, results: [] })
    }

    const results = await Promise.allSettled(
      activeContests.map((c) => pollContest(c.id).then((r) => ({ ...r, name: c.name })))
    )

    const summary = results.map((r, i) => {
      if (r.status === 'fulfilled') {
        const { name, changed, details } = r.value
        console.log(`[cron/poll] ${name}: changed=${changed} — ${details}`)
        return { name, changed, details }
      } else {
        const name = activeContests[i].name
        console.error(`[cron/poll] ${name}: ERROR — ${r.reason?.message}`)
        return { name, changed: false, error: r.reason?.message }
      }
    })

    return NextResponse.json({
      polled: activeContests.length,
      dataChanged: summary.some((r) => r.changed),
      results: summary,
    })
  } catch (err) {
    console.error('Cron poll error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
