import { config } from 'dotenv'
config({ path: '.env.local' })
config()
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const MANAGERS = [
  { username: 'whale',  icon: '🐋' },
  { username: 'shark',  icon: '🦈' },
  { username: 'eagle',  icon: '🦅' },
  { username: 'bear',   icon: '🐻' },
]

const PICKS = ['LAD', 'NYY', 'ATL', 'HOU']

// Plausible cumulative whiff totals per team per day
const DAILY_PROGRESSIONS = [
  [8, 15, 22, 31, 40, 47, 56],   // LAD — 1st place
  [6, 13, 21, 28, 34, 42, 51],   // NYY — 2nd
  [5, 10, 17, 24, 33, 39, 47],   // ATL — 3rd
  [4,  9, 14, 21, 28, 35, 43],   // HOU — 4th
]

// Related metrics: Whiff % and Avg Pitch Velo — not counted towards standings
const RELATED_VALUES = [
  { 'Whiff %': 34.2, 'Avg Velo': 93.7 },  // LAD
  { 'Whiff %': 31.8, 'Avg Velo': 92.4 },  // NYY
  { 'Whiff %': 29.5, 'Avg Velo': 91.8 },  // ATL
  { 'Whiff %': 27.1, 'Avg Velo': 90.6 },  // HOU
]

async function main() {
  // --- Managers ---
  const managerIds: string[] = []
  for (const m of MANAGERS) {
    const existing = await prisma.manager.findUnique({ where: { username: m.username } })
    if (existing) {
      console.log(`Manager "${m.username}" already exists, using existing.`)
      managerIds.push(existing.id)
    } else {
      const passwordHash = await bcrypt.hash('password123', 10)
      const created = await prisma.manager.create({
        data: { username: m.username, passwordHash, isAdmin: false, icon: m.icon },
      })
      managerIds.push(created.id)
      console.log(`Created manager: ${m.username}`)
    }
  }

  // --- Contest ---
  const now = new Date()
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - 7)
  startDate.setHours(0, 0, 0, 0)
  const endDate = new Date(now)
  endDate.setDate(endDate.getDate() + 4)
  endDate.setHours(23, 59, 59, 0)
  const draftOpenAt = new Date(startDate)
  draftOpenAt.setDate(draftOpenAt.getDate() - 1)
  const draftCloseAt = new Date(draftOpenAt.getTime() + 3 * 60 * 60 * 1000)

  const metricConfig = {
    columns: { whiff: 'whiff' },
    teamColumn: 'pitcher_team',
    dateColumn: 'game_date',
    aggregation: [{ alias: 'whiff', op: 'SUM' }],
    unit: 'Whiffs',
    higherIsBetter: true,
  }

  const existingContest = await prisma.contest.findFirst({
    where: { season: 2025, contestNumber: 1 },
  })

  let contestId: string
  if (existingContest) {
    console.log('Demo contest already exists, using existing.')
    contestId = existingContest.id
    await prisma.contest.update({
      where: { id: contestId },
      data: { status: 'ACTIVE', startDate, endDate },
    })
  } else {
    const contest = await prisma.contest.create({
      data: {
        name: 'Week 1 — 2025',
        contestNumber: 1,
        season: 2025,
        metricName: 'Total Whiffs',
        metricDescription: 'Sum of all pitches whiffed on by the drafted team\'s pitchers',
        savantCsvUrl: 'https://baseballsavant.mlb.com/statcast_search/csv',
        metricConfig,
        startDate,
        endDate,
        draftOpenAt,
        draftCloseAt,
        cascadeWindowMinutes: 1,
        status: 'ACTIVE',
      },
    })
    contestId = contest.id
    console.log(`Created contest: ${contest.name}`)
  }

  // --- Picks & Standings ---
  for (let i = 0; i < MANAGERS.length; i++) {
    const managerId = managerIds[i]
    const teamCode = PICKS[i]
    const progression = DAILY_PROGRESSIONS[i]

    // Build dailyValues: map each past contest date to a cumulative value
    const dailyValues: Record<string, number> = {}
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + d)
      if (date > now) break
      const dateStr = date.toISOString().slice(0, 10)
      dailyValues[dateStr] = progression[d] ?? progression[progression.length - 1]
    }

    const metricValue = Object.values(dailyValues).at(-1) ?? 0
    const rank = i + 1
    const relatedValues = RELATED_VALUES[i]

    // ContestPick
    await prisma.contestPick.upsert({
      where: { contestId_managerId: { contestId, managerId } },
      create: { contestId, managerId, teamCode },
      update: { teamCode },
    })

    // Standing
    await prisma.standing.upsert({
      where: { contestId_managerId: { contestId, managerId } },
      create: { contestId, managerId, teamCode, metricValue, rank, dailyValues, relatedValues },
      update: { teamCode, metricValue, rank, dailyValues, relatedValues },
    })

    console.log(`Seeded ${MANAGERS[i].username} → ${teamCode} (rank ${rank}, total ${metricValue})`)
  }

  // DraftSlots
  for (let i = 0; i < MANAGERS.length; i++) {
    const managerId = managerIds[i]
    await prisma.draftSlot.upsert({
      where: { contestId_managerId: { contestId, managerId } },
      create: {
        contestId,
        managerId,
        pickOrder: i + 1,
        eligibleAt: draftOpenAt,
        pickedAt: draftOpenAt,
      },
      update: {},
    })
  }

  console.log('\nDemo seed complete. Run `npm run dev` and visit / to see the standings accordion.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
