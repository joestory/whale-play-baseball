import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { pollContest } from '@/lib/savant'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: contestId } = await params

  try {
    await pollContest(contestId, { force: true })
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Poll failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
