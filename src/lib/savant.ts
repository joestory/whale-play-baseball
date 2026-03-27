import { parse } from 'csv-parse/sync'
import { prisma } from './db'
import {
  aggregateByTeam,
  aggregateByTeamAndDate,
  aggregateRelatedByTeam,
  computeRanks,
  parseMetricConfig,
} from './metrics'
import { autoSetDraftOrderFromPriorStandings } from './draft'

type CsvRow = Record<string, string>

// Convert a Baseball Savant search URL to a CSV download URL
export function searchUrlToCsvUrl(url: string): string {
  const withoutAnchor = url.split('#')[0]
  if (withoutAnchor.includes('/statcast_search/csv')) return withoutAnchor
  return withoutAnchor.replace('/statcast_search?', '/statcast_search/csv?')
}

// Detect the year referenced in a Savant URL (from game_date_gt or hfSea params)
export function detectYearFromUrl(url: string): number | null {
  const dateMatch = url.match(/game_date_gt=(\d{4})-/)
  if (dateMatch) return parseInt(dateMatch[1])
  const seaMatch = url.match(/hfSea=(\d{4})(?:%7C|\|)/)
  if (seaMatch) return parseInt(seaMatch[1])
  return null
}

// Rewrite the year in a Savant URL's query string (path unchanged)
export function rewriteUrlYear(url: string, fromYear: number, toYear: number): string {
  const qIdx = url.indexOf('?')
  if (qIdx === -1) return url
  const path = url.slice(0, qIdx)
  const query = url.slice(qIdx + 1).replace(new RegExp(String(fromYear), 'g'), String(toYear))
  return `${path}?${query}`
}

// Fetch a CSV URL and return its column headers
export async function fetchCsvHeaders(url: string): Promise<string[]> {
  const csvText = await fetchCsv(url)
  const rows = parseCsv(csvText)
  if (rows.length === 0) return []
  return Object.keys(rows[0])
}

export async function fetchCsv(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'WhalePlayBaseball/1.0' },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch CSV: ${res.status} ${res.statusText}`)
  }
  return res.text()
}

export function parseCsv(csvText: string): CsvRow[] {
  return parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRow[]
}

export async function pollContest(contestId: string): Promise<{ changed: boolean; details: string }> {
  const contest = await prisma.contest.findUniqueOrThrow({
    where: { id: contestId },
    include: {
      picks: true,
      standings: { select: { managerId: true, metricValue: true } },
    },
  })

  if (contest.picks.length === 0) return { changed: false, details: 'no picks' }

  const prevValues = new Map(contest.standings.map((s) => [s.managerId, s.metricValue]))

  const config = parseMetricConfig(contest.metricConfig)
  const csvText = await fetchCsv(contest.savantCsvUrl)
  const allRows = parseCsv(csvText)

  // Exclude today and future-dated rows — Savant includes scheduled games that haven't
  // been played yet. Only include dates strictly before today so all data is complete.
  const today = new Date().toISOString().slice(0, 10)
  const rows = config.dateColumn
    ? allRows.filter((r) => !r[config.dateColumn!] || (r[config.dateColumn!] ?? '').slice(0, 10) < today)
    : allRows

  const teamTotals = aggregateByTeam(rows, config)
  const teamDaily = aggregateByTeamAndDate(rows, config)
  const teamRelated = aggregateRelatedByTeam(rows, config)

  const managerValues = new Map<string, number>()
  for (const pick of contest.picks) {
    managerValues.set(pick.managerId, teamTotals.get(pick.teamCode) ?? 0)
  }

  const ranks = computeRanks(managerValues, config.higherIsBetter !== false)

  await prisma.$transaction([
    ...contest.picks.map((pick) =>
      prisma.standing.upsert({
        where: { contestId_managerId: { contestId, managerId: pick.managerId } },
        create: {
          contestId,
          managerId: pick.managerId,
          teamCode: pick.teamCode,
          metricValue: managerValues.get(pick.managerId) ?? 0,
          rank: ranks.get(pick.managerId) ?? null,
          dailyValues: teamDaily.get(pick.teamCode) ?? {},
          relatedValues: teamRelated.get(pick.teamCode) ?? {},
        },
        update: {
          teamCode: pick.teamCode,
          metricValue: managerValues.get(pick.managerId) ?? 0,
          rank: ranks.get(pick.managerId) ?? null,
          dailyValues: teamDaily.get(pick.teamCode) ?? {},
          relatedValues: teamRelated.get(pick.teamCode) ?? {},
        },
      })
    ),
    prisma.contest.update({
      where: { id: contestId },
      data: { lastPolledAt: new Date() },
    }),
  ])

  const changes: string[] = []
  for (const [managerId, newValue] of managerValues) {
    const prev = prevValues.get(managerId) ?? 0
    if (Math.abs(newValue - prev) > 0.0001) {
      changes.push(`manager ${managerId}: ${prev} → ${newValue}`)
    }
  }

  return {
    changed: changes.length > 0,
    details: changes.length > 0 ? changes.join(', ') : 'no change',
  }
}

export async function checkContestStatuses(): Promise<void> {
  const now = new Date()

  await prisma.contest.updateMany({
    where: { status: 'UPCOMING', draftOpenAt: { lte: now } },
    data: { status: 'DRAFTING' },
  })

  await prisma.contest.updateMany({
    where: { status: 'DRAFTING', draftCloseAt: { lte: now } },
    data: { status: 'ACTIVE' },
  })

  await prisma.contest.updateMany({
    where: { status: 'ACTIVE', endDate: { lte: now } },
    data: { status: 'COMPLETED' },
  })

  // Auto-set draft order from prior standings for contests opening within 2 hours
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000)
  const upcomingDraftingSoon = await prisma.contest.findMany({
    where: { status: 'UPCOMING', draftOpenAt: { lte: twoHoursFromNow } },
    select: { id: true },
  })
  await Promise.allSettled(upcomingDraftingSoon.map((c) => autoSetDraftOrderFromPriorStandings(c.id)))
}
