import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { initializeDraftSlots, shuffleArray } from '@/lib/draft'
import { prisma } from '@/lib/db'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.isAdmin) throw new Error('Forbidden')
}

export async function PUT(
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
  let orderedManagerIds: string[] = body.orderedManagerIds

  // If randomize flag is set, shuffle all managers
  if (body.randomize) {
    const managers = await prisma.manager.findMany({
      where: { isAdmin: false },
      select: { id: true },
    })
    orderedManagerIds = shuffleArray(managers.map((m) => m.id))
  }

  if (!orderedManagerIds || orderedManagerIds.length === 0) {
    return NextResponse.json({ error: 'orderedManagerIds is required' }, { status: 400 })
  }

  try {
    await initializeDraftSlots(contestId, orderedManagerIds)
    return NextResponse.json({ success: true, count: orderedManagerIds.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to set draft order'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
