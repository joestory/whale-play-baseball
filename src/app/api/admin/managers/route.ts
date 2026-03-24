import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

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

  const managers = await prisma.manager.findMany({
    orderBy: { username: 'asc' },
    select: { id: true, username: true, isAdmin: true, createdAt: true },
  })
  return NextResponse.json(managers)
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { username, password, isAdmin = false } = body as {
    username?: string
    password?: string
    isAdmin?: boolean
  }

  if (!username || !password) {
    return NextResponse.json({ error: 'username and password are required' }, { status: 400 })
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12)
    const manager = await prisma.manager.create({
      data: { username, passwordHash, isAdmin },
      select: { id: true, username: true, isAdmin: true, createdAt: true },
    })
    return NextResponse.json(manager, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create manager'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
