import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.isAdmin) throw new Error('Forbidden')
}

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const contests = await prisma.contest.findMany({
    orderBy: [{ season: 'desc' }, { weekNumber: 'desc' }],
  })
  return NextResponse.json(contests)
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()

  try {
    const contest = await prisma.contest.create({
      data: {
        name: body.name,
        weekNumber: Number(body.weekNumber),
        season: Number(body.season),
        metricName: body.metricName,
        metricDescription: body.metricDescription ?? null,
        commissionerMessage: body.commissionerMessage ?? null,
        savantCsvUrl: body.savantCsvUrl,
        metricConfig: body.metricConfig,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        draftOpenAt: new Date(body.draftOpenAt),
        draftCloseAt: new Date(body.draftCloseAt),
        cascadeWindowMinutes: Number(body.cascadeWindowMinutes ?? 60),
      },
    })
    return NextResponse.json(contest, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create contest'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
