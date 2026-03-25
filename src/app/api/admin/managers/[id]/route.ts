import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.isAdmin) throw new Error('Forbidden')
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const updateData: Record<string, unknown> = {}

  if (body.username !== undefined) updateData.username = body.username
  if (body.icon !== undefined) updateData.icon = body.icon
  if (body.isAdmin !== undefined) updateData.isAdmin = body.isAdmin
  if (body.password) {
    updateData.passwordHash = await bcrypt.hash(body.password, 12)
  }

  try {
    const manager = await prisma.manager.update({
      where: { id },
      data: updateData,
      select: { id: true, username: true, icon: true, isAdmin: true, createdAt: true },
    })
    return NextResponse.json(manager)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update manager'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  try {
    await prisma.manager.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete manager'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
