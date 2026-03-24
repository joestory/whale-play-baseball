import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const standings = await prisma.standing.findMany({
    where: { contestId: id },
    orderBy: { rank: 'asc' },
    include: {
      manager: { select: { id: true, username: true } },
    },
  })

  return NextResponse.json(standings)
}
