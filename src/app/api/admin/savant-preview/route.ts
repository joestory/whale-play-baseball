import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  searchUrlToCsvUrl,
  detectYearFromUrl,
  rewriteUrlYear,
  fetchCsvHeaders,
} from '@/lib/savant'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { url, contestSeason } = (await req.json()) as {
    url: string
    contestSeason: number
  }

  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  try {
    const csvUrl = searchUrlToCsvUrl(url)
    const fromYear = detectYearFromUrl(csvUrl)
    const liveUrl =
      fromYear && contestSeason
        ? rewriteUrlYear(csvUrl, fromYear, contestSeason)
        : csvUrl
    const columns = await fetchCsvHeaders(csvUrl)

    if (columns.length === 0) {
      return NextResponse.json(
        { error: 'No data returned — try a wider date range' },
        { status: 422 }
      )
    }

    return NextResponse.json({ columns, liveUrl, fromYear })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `Could not fetch CSV — ${message}` },
      { status: 422 }
    )
  }
}
