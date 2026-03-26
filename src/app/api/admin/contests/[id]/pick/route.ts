import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { Prisma } from '@/generated/prisma/client'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.isAdmin) throw new Error('Forbidden')
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: contestId } = await params
  const body = await req.json()
  const { managerId, teamCode } = body as { managerId?: string; teamCode?: string }

  if (!managerId || !teamCode) {
    return NextResponse.json({ error: 'managerId and teamCode are required' }, { status: 400 })
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.contestPick.upsert({
        where: { contestId_managerId: { contestId, managerId } },
        create: { contestId, managerId, teamCode },
        update: { teamCode },
      })

      await tx.standing.upsert({
        where: { contestId_managerId: { contestId, managerId } },
        create: { contestId, managerId, teamCode, metricValue: 0 },
        update: { teamCode },
      })

      await tx.draftSlot.updateMany({
        where: { contestId, managerId, pickedAt: null },
        data: { pickedAt: new Date() },
      })
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'That team is already taken by another manager' }, { status: 409 })
    }
    const message = err instanceof Error ? err.message : 'Failed to set pick'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
