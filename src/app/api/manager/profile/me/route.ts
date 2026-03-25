import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const manager = await prisma.manager.findUnique({
    where: { id: session.user.id },
    select: { id: true, username: true, icon: true },
  })

  if (!manager) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(manager)
}
