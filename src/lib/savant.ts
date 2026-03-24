import { parse } from 'csv-parse/sync'
import { prisma } from './db'
import { aggregateByTeam, computeRanks, parseMetricConfig } from './metrics'

type CsvRow = Record<string, string>

export async function fetchCsv(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'WhalePlayBaseball/1.0' },
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch Baseball Savant CSV: ${res.status} ${res.statusText}`)
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

export async function pollContest(contestId: string): Promise<void> {
  const contest = await prisma.contest.findUniqueOrThrow({
    where: { id: contestId },
    include: { picks: true },
  })

  if (contest.picks.length === 0) return

  const config = parseMetricConfig(contest.metricConfig)
  const csvText = await fetchCsv(contest.savantCsvUrl)
  const rows = parseCsv(csvText)
  const teamTotals = aggregateByTeam(rows, config)

  // Build managerId → metricValue map
  const managerValues = new Map<string, number>()
  for (const pick of contest.picks) {
    managerValues.set(pick.managerId, teamTotals.get(pick.teamCode) ?? 0)
  }

  const ranks = computeRanks(managerValues, config.higherIsBetter !== false)

  // Upsert standings in a transaction
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
        },
        update: {
          metricValue: managerValues.get(pick.managerId) ?? 0,
          teamCode: pick.teamCode,
          rank: ranks.get(pick.managerId) ?? null,
        },
      })
    ),
    prisma.contest.update({
      where: { id: contestId },
      data: { lastPolledAt: new Date() },
    }),
  ])
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
}
