import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const updateData: Record<string, unknown> = {}

  if (body.icon !== undefined) {
    updateData.icon = body.icon
  }

  if (body.newPassword) {
    if (!body.currentPassword) {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
    }
    const manager = await prisma.manager.findUnique({ where: { id: session.user.id } })
    if (!manager) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const valid = await bcrypt.compare(body.currentPassword, manager.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }
    updateData.passwordHash = await bcrypt.hash(body.newPassword, 12)
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const updated = await prisma.manager.update({
    where: { id: session.user.id },
    data: updateData,
    select: { id: true, username: true, icon: true },
  })

  return NextResponse.json(updated)
}
