import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const contests = await prisma.contest.findMany({
    orderBy: [{ season: 'desc' }, { contestNumber: 'desc' }],
    select: {
      id: true,
      name: true,
      contestNumber: true,
      season: true,
      metricName: true,
      status: true,
      draftOpenAt: true,
      draftCloseAt: true,
      startDate: true,
      endDate: true,
      lastPolledAt: true,
    },
  })
  return NextResponse.json(contests)
}
