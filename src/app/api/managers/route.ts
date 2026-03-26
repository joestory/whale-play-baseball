import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Public endpoint — returns manager usernames for the login dropdown
export async function GET() {
  const managers = await prisma.manager.findMany({
    orderBy: { username: 'asc' },
    select: { username: true },
  })
  return NextResponse.json(managers.map((m) => m.username))
}
