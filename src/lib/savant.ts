import { parse } from 'csv-parse/sync'
import { prisma } from './db'
import {
  aggregateByTeam,
  aggregateByTeamAndDate,
  aggregateRelatedByTeam,
  aggregateOpponentsByTeamAndDate,
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

// Returns the start of tonight's nightly poll window: 2AM Pacific = 09:00 UTC (PDT/UTC-7).
// Handles PDT/PST automatically by computing the Pacific offset from a noon UTC anchor.
function tonightWindowStart(): Date {
  const now = new Date()
  const todayPacific = now.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
  const [y, m, d] = todayPacific.split('-').map(Number)
  const noonUtc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  const pacificHour = Number(
    noonUtc.toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', hour12: false })
  )
  const pacificOffsetHours = 12 - pacificHour // 7 for PDT, 8 for PST
  return new Date(Date.UTC(y, m - 1, d, 2 + pacificOffsetHours, 0, 0))
}

export async function pollContest(
  contestId: string,
  { force = false }: { force?: boolean } = {}
): Promise<{ changed: boolean; details: string }> {
  const contest = await prisma.contest.findUniqueOrThrow({
    where: { id: contestId },
    include: {
      picks: true,
      standings: { select: { managerId: true, metricValue: true, rank: true } },
    },
  })

  if (contest.picks.length === 0) return { changed: false, details: 'no picks' }

  // Skip if data was already found in tonight's window (2AM PDT onward), unless forced.
  if (!force && contest.lastPolledAt && contest.lastPolledAt >= tonightWindowStart()) {
    return { changed: false, details: 'already updated tonight' }
  }

  const prevValues = new Map(contest.standings.map((s) => [s.managerId, s.metricValue]))
  const prevRanks = new Map(contest.standings.map((s) => [s.managerId, s.rank]))

  const config = parseMetricConfig(contest.metricConfig)
  const csvText = await fetchCsv(contest.savantCsvUrl)
  const allRows = parseCsv(csvText)

  // Exclude today and future-dated rows — Savant includes scheduled games that haven't
  // been played yet. Only include dates strictly before today (Eastern) so all data is complete.
  const todayPacific = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const rows = config.dateColumn
    ? allRows.filter((r) => !r[config.dateColumn!] || (r[config.dateColumn!] ?? '').slice(0, 10) < todayPacific)
    : allRows

  const teamTotals = aggregateByTeam(rows, config)
  const teamDaily = aggregateByTeamAndDate(rows, config)
  const teamRelated = aggregateRelatedByTeam(rows, config)
  const teamOpponents = await aggregateOpponentsByTeamAndDate(rows, config)

  const managerValues = new Map<string, number>()
  for (const pick of contest.picks) {
    managerValues.set(pick.managerId, teamTotals.get(pick.teamCode) ?? 0)
  }

  // PDX has no Savant data and is always ranked last, regardless of metric direction
  const pdxManagerId = contest.picks.find((p) => p.teamCode === 'PDX')?.managerId
  const rankingValues = pdxManagerId
    ? new Map([...managerValues].filter(([id]) => id !== pdxManagerId))
    : managerValues

  const ranks = computeRanks(rankingValues, config.higherIsBetter !== false)
  if (pdxManagerId) ranks.set(pdxManagerId, contest.picks.length)

  const changes: string[] = []
  for (const [managerId, newValue] of managerValues) {
    const prev = prevValues.get(managerId) ?? 0
    if (Math.abs(newValue - prev) > 0.0001) {
      changes.push(`manager ${managerId}: ${prev} → ${newValue}`)
    }
  }

  const changed = changes.length > 0

  const upserts = contest.picks.map((pick) =>
    prisma.standing.upsert({
      where: { contestId_managerId: { contestId, managerId: pick.managerId } },
      create: {
        contestId,
        managerId: pick.managerId,
        teamCode: pick.teamCode,
        metricValue: managerValues.get(pick.managerId) ?? 0,
        rank: ranks.get(pick.managerId) ?? null,
        previousRank: prevRanks.get(pick.managerId) ?? null,
        dailyValues: teamDaily.get(pick.teamCode) ?? {},
        relatedValues: teamRelated.get(pick.teamCode) ?? {},
        dailyOpponents: teamOpponents.get(pick.teamCode) ?? {},
      },
      update: {
        teamCode: pick.teamCode,
        metricValue: managerValues.get(pick.managerId) ?? 0,
        rank: ranks.get(pick.managerId) ?? null,
        // Only snapshot previousRank when data actually changed — preserves the trend
        // from the last real data update across no-change polls and force polls.
        ...(changed ? { previousRank: prevRanks.get(pick.managerId) ?? null } : {}),
        dailyValues: teamDaily.get(pick.teamCode) ?? {},
        relatedValues: teamRelated.get(pick.teamCode) ?? {},
        dailyOpponents: teamOpponents.get(pick.teamCode) ?? {},
      },
    })
  )

  // Only update lastPolledAt when data actually changed — this both timestamps
  // the true last data refresh (shown in the UI) and acts as the "already updated
  // tonight" signal that prevents redundant retries.
  await prisma.$transaction([
    ...upserts,
    ...(changed
      ? [prisma.contest.update({ where: { id: contestId }, data: { lastPolledAt: new Date() } })]
      : []),
  ])

  return {
    changed,
    details: changed ? changes.join(', ') : 'no change',
  }
}

// Returns the start of today in Pacific time as a UTC Date, for date-boundary comparisons.
// Contests are not COMPLETED until the day *after* endDate, so the final polling run
// can include the end date.
function startOfTodayPacific(): Date {
  const pacificDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' })
  return new Date(pacificDateStr)
}

// Derive the correct ContestStatus purely from date fields and the current time.
// Uses Pacific-timezone day boundaries for the COMPLETED transition.
export function deriveContestStatus(
  contest: { draftOpenAt: Date; draftCloseAt: Date; endDate: Date },
  now = new Date(),
): 'UPCOMING' | 'DRAFTING' | 'ACTIVE' | 'COMPLETED' {
  const todayPacific = startOfTodayPacific()
  if (now < contest.draftOpenAt) return 'UPCOMING'
  if (now < contest.draftCloseAt) return 'DRAFTING'
  if (contest.endDate < todayPacific) return 'COMPLETED'
  return 'ACTIVE'
}

export async function checkContestStatuses(): Promise<void> {
  const now = new Date()
  // Start of today in Pacific time — status does not advance to COMPLETED until the day
  // after endDate, so the final Savant poll is inclusive of the end date.
  const todayPacific = startOfTodayPacific()

  await prisma.contest.updateMany({
    where: { status: 'UPCOMING', draftOpenAt: { lte: now } },
    data: { status: 'DRAFTING' },
  })

  // Before closing the draft window, auto-assign MLB2PDX to Heff if she hasn't picked
  const closingDraftContests = await prisma.contest.findMany({
    where: { status: 'DRAFTING', draftCloseAt: { lte: now } },
    select: { id: true },
  })
  if (closingDraftContests.length > 0) {
    const heff = await prisma.manager.findFirst({
      where: { username: 'Heff' },
      select: { id: true },
    })
    if (heff) {
      await Promise.allSettled(
        closingDraftContests.map(async ({ id: contestId }) => {
          await prisma.$transaction(async (tx) => {
            const slot = await tx.draftSlot.findUnique({
              where: { contestId_managerId: { contestId, managerId: heff.id } },
            })
            if (!slot || slot.pickedAt) return

            const pdxTaken = await tx.contestPick.findFirst({
              where: { contestId, teamCode: 'PDX' },
            })
            if (pdxTaken) return

            await tx.contestPick.create({
              data: { contestId, managerId: heff.id, teamCode: 'PDX' },
            })
            await tx.draftSlot.update({
              where: { id: slot.id },
              data: { pickedAt: new Date() },
            })
            await tx.standing.upsert({
              where: { contestId_managerId: { contestId, managerId: heff.id } },
              create: { contestId, managerId: heff.id, teamCode: 'PDX', metricValue: 0 },
              update: { teamCode: 'PDX', metricValue: 0 },
            })
          })
        })
      )
    }
  }

  await prisma.contest.updateMany({
    where: { status: 'DRAFTING', draftCloseAt: { lte: now } },
    data: { status: 'ACTIVE' },
  })

  // Identify contests transitioning to COMPLETED so we can set draft order for their successors
  const aboutToComplete = await prisma.contest.findMany({
    where: { status: 'ACTIVE', endDate: { lt: todayPacific } },
    select: { id: true, season: true, contestNumber: true },
  })

  await prisma.contest.updateMany({
    where: { status: 'ACTIVE', endDate: { lt: todayPacific } },
    data: { status: 'COMPLETED' },
  })

  // For each newly-completed contest, find the next contest in the same season and set its draft order
  if (aboutToComplete.length > 0) {
    const successors = await Promise.all(
      aboutToComplete.map((c) =>
        prisma.contest.findFirst({
          where: {
            season: c.season,
            contestNumber: { gt: c.contestNumber },
            status: { in: ['UPCOMING', 'DRAFTING'] },
          },
          orderBy: { contestNumber: 'asc' },
          select: { id: true },
        })
      )
    )
    const successorIds = successors.flatMap((s) => (s ? [s.id] : []))
    await Promise.allSettled(successorIds.map((id) => autoSetDraftOrderFromPriorStandings(id)))
  }

  // Also auto-set draft order from prior standings for contests opening within 2 hours (fallback)
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000)
  const upcomingDraftingSoon = await prisma.contest.findMany({
    where: { status: 'UPCOMING', draftOpenAt: { lte: twoHoursFromNow } },
    select: { id: true },
  })
  await Promise.allSettled(upcomingDraftingSoon.map((c) => autoSetDraftOrderFromPriorStandings(c.id)))
}
