import { config } from 'dotenv'
config({ path: '.env.local' })
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const c = await prisma.contest.findFirst({
    where: { contestNumber: 2, season: 2025 },
    select: { id: true, status: true, draftOpenAt: true, draftCloseAt: true },
  })
  if (!c) { console.log('Contest week 2 not found'); return }
  console.log('Contest:', c.status, '| openAt:', c.draftOpenAt, '| closeAt:', c.draftCloseAt)
  console.log('Now:', new Date())

  const slots = await prisma.draftSlot.findMany({
    where: { contestId: c.id },
    orderBy: { pickOrder: 'asc' },
    include: { manager: { select: { username: true } } },
  })
  console.log('\nSlots:')
  for (const s of slots) {
    const eligible = s.eligibleAt <= new Date()
    console.log(` ${s.pickOrder}. ${s.manager.username} | eligibleAt: ${s.eligibleAt} | eligible: ${eligible} | pickedAt: ${s.pickedAt}`)
  }

  const picks = await prisma.contestPick.findMany({ where: { contestId: c.id } })
  console.log('\nPicks:', picks.map(p => p.teamCode).join(', ') || '(none)')
}

main().catch(console.error).finally(() => prisma.$disconnect())
