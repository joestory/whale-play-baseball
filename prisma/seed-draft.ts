import { config } from 'dotenv'
config({ path: '.env.local' })
config()
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const MANAGERS = [
  { username: 'whale', icon: '🐋' },
  { username: 'shark', icon: '🦈' },
  { username: 'eagle', icon: '🦅' },
  { username: 'bear',  icon: '🐻' },
]

async function main() {
  // --- Managers ---
  const managerIds: string[] = []
  for (const m of MANAGERS) {
    const existing = await prisma.manager.findUnique({ where: { username: m.username } })
    if (existing) {
      managerIds.push(existing.id)
      console.log(`Manager "${m.username}" already exists`)
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
  // draftOpenAt = now - 90s so that:
  //   manager 1 (whale) eligible at t+0  → 90s ago ✅
  //   manager 2 (shark) eligible at t+1m → 30s ago ✅
  //   manager 3 (eagle) eligible at t+2m → in ~30s ⏳
  //   manager 4 (bear)  eligible at t+3m → in ~90s ⏳
  const now = new Date()
  const draftOpenAt = new Date(now.getTime() - 90 * 1000)
  const draftCloseAt = new Date(draftOpenAt.getTime() + 3 * 60 * 60 * 1000)
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() + 1)
  startDate.setHours(0, 0, 0, 0)
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 6)
  endDate.setHours(23, 59, 59, 0)

  const metricConfig = {
    columns: { whiff: 'whiff' },
    teamColumn: 'pitcher_team',
    dateColumn: 'game_date',
    aggregation: [{ alias: 'whiff', op: 'SUM' }],
    unit: 'Whiffs',
    higherIsBetter: true,
  }

  const existingContest = await prisma.contest.findFirst({
    where: { season: 2025, contestNumber: 2 },
  })

  let contestId: string
  if (existingContest) {
    console.log('Draft contest (week 2) already exists, updating to DRAFTING...')
    contestId = existingContest.id
    await prisma.contest.update({
      where: { id: contestId },
      data: { status: 'DRAFTING', draftOpenAt, draftCloseAt, startDate, endDate },
    })
  } else {
    const contest = await prisma.contest.create({
      data: {
        name: 'Week 2 — 2025',
        contestNumber: 2,
        season: 2025,
        metricName: 'Total Whiffs',
        metricDescription: "Sum of all pitches whiffed on by the drafted team's pitchers",
        savantCsvUrl: 'https://baseballsavant.mlb.com/statcast_search/csv',
        metricConfig,
        startDate,
        endDate,
        draftOpenAt,
        draftCloseAt,
        cascadeWindowMinutes: 1,
        status: 'DRAFTING',
      },
    })
    contestId = contest.id
    console.log(`Created contest: ${contest.name}`)
  }

  // --- Clear existing picks and standings ---
  await prisma.contestPick.deleteMany({ where: { contestId } })
  await prisma.standing.deleteMany({ where: { contestId } })

  // --- Draft Slots (cascade math inline) ---
  await prisma.draftSlot.deleteMany({ where: { contestId } })
  for (let i = 0; i < managerIds.length; i++) {
    const cascadeMs = i * 1 * 60 * 1000 // cascadeWindowMinutes = 1
    const eligibleAt = new Date(draftOpenAt.getTime() + cascadeMs)
    await prisma.draftSlot.create({
      data: {
        contestId,
        managerId: managerIds[i],
        pickOrder: i + 1,
        eligibleAt,
      },
    })
    console.log(`Slot ${i + 1}: ${MANAGERS[i].username} eligible at ${eligibleAt.toISOString()}`)
  }

  // --- Pre-seed: whale picked LAD ---
  const whaleId = managerIds[0]
  await prisma.contestPick.upsert({
    where: { contestId_managerId: { contestId, managerId: whaleId } },
    create: { contestId, managerId: whaleId, teamCode: 'LAD' },
    update: { teamCode: 'LAD' },
  })
  await prisma.draftSlot.updateMany({
    where: { contestId, managerId: whaleId },
    data: { pickedAt: now },
  })
  await prisma.standing.upsert({
    where: { contestId_managerId: { contestId, managerId: whaleId } },
    create: { contestId, managerId: whaleId, teamCode: 'LAD', metricValue: 0, rank: 1, dailyValues: {}, relatedValues: {} },
    update: { teamCode: 'LAD', metricValue: 0 },
  })
  console.log('\nPre-seeded: whale → LAD (picked)')

  console.log('\nDraft seed complete.')
  console.log('  Log in as "whale"  → should see "Pick Submitted" (LAD highlighted)')
  console.log('  Log in as "shark"  → should see "It\'s your turn!" (LAD dimmed)')
  console.log('  Log in as "eagle"  → should see countdown (~30s)')
  console.log('  Log in as "bear"   → should see countdown (~90s)')
  console.log('\nPasswords: password123 for all managers')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
