import { prisma } from './db'
import { Prisma } from '@/generated/prisma/client'

/**
 * Create DraftSlot rows for a contest after the admin sets pick order.
 * Slot 1 becomes eligible at draftOpenAt.
 * Each subsequent slot opens cascadeWindowMinutes later.
 */
export async function initializeDraftSlots(
  contestId: string,
  orderedManagerIds: string[]
): Promise<void> {
  const contest = await prisma.contest.findUniqueOrThrow({ where: { id: contestId } })

  // Delete any existing slots before re-initializing
  await prisma.draftSlot.deleteMany({ where: { contestId } })

  const slots = orderedManagerIds.map((managerId, index) => {
    const cascadeMs = index * contest.cascadeWindowMinutes * 60 * 1000
    const eligibleAt = new Date(contest.draftOpenAt.getTime() + cascadeMs)
    return { contestId, managerId, pickOrder: index + 1, eligibleAt }
  })

  await prisma.draftSlot.createMany({ data: slots })
}

/**
 * After a pick is made, cascade-reset eligibleAt for all remaining unpicked slots.
 * N+1 (immediately next) becomes eligible at pickTime.
 * N+2 gets pickTime + 1×cascadeWindow, N+3 gets pickTime + 2×cascadeWindow, etc.
 * Never pushes a slot further into the future than its current eligibleAt.
 */
export async function cascadeEligibilityAfterPick(
  contestId: string,
  pickedAt: Date,
  db: Prisma.TransactionClient
): Promise<void> {
  const contest = await db.contest.findUniqueOrThrow({ where: { id: contestId } })

  const remainingSlots = await db.draftSlot.findMany({
    where: { contestId, pickedAt: null },
    orderBy: { pickOrder: 'asc' },
  })

  const cascadeMs = contest.cascadeWindowMinutes * 60 * 1000

  for (let i = 0; i < remainingSlots.length; i++) {
    const newEligibleAt = new Date(pickedAt.getTime() + i * cascadeMs)
    if (newEligibleAt < remainingSlots[i].eligibleAt) {
      await db.draftSlot.update({
        where: { id: remainingSlots[i].id },
        data: { eligibleAt: newEligibleAt },
      })
    }
  }
}

/**
 * Returns all managers who are currently eligible to pick
 * (eligibleAt <= now and haven't picked yet).
 * Sorted by pickOrder ascending.
 */
export async function getEligibleManagers(contestId: string) {
  return prisma.draftSlot.findMany({
    where: {
      contestId,
      pickedAt: null,
      eligibleAt: { lte: new Date() },
    },
    orderBy: { pickOrder: 'asc' },
    include: { manager: { select: { id: true, username: true } } },
  })
}

/**
 * Returns all draft slots for a contest with manager info.
 */
export async function getDraftSlots(contestId: string) {
  return prisma.draftSlot.findMany({
    where: { contestId },
    orderBy: { pickOrder: 'asc' },
    include: { manager: { select: { id: true, username: true } } },
  })
}

/**
 * Derive draft order for a contest from the prior contest's standings
 * (rank 1 picks first). Skips if any picks have already been made.
 * Returns true if the order was set, false if skipped or no prior data found.
 */
export async function autoSetDraftOrderFromPriorStandings(contestId: string): Promise<boolean> {
  const contest = await prisma.contest.findUniqueOrThrow({
    where: { id: contestId },
    include: {
      draftSlots: { where: { pickedAt: { not: null } }, take: 1 },
    },
  })

  // Don't override once picking has started
  if (contest.draftSlots.length > 0) return false

  const priorContest = await prisma.contest.findFirst({
    where: { season: contest.season, contestNumber: { lt: contest.contestNumber } },
    orderBy: { contestNumber: 'desc' },
    include: {
      standings: {
        orderBy: { rank: 'asc' },
        include: { manager: { select: { id: true, isAdmin: true } } },
      },
    },
  })

  if (!priorContest || priorContest.standings.length === 0) return false

  const orderedManagerIds = priorContest.standings
    .filter((s) => !s.manager.isAdmin)
    .map((s) => s.managerId)

  if (orderedManagerIds.length === 0) return false

  // Append any managers not in the prior standings (new managers)
  const allManagers = await prisma.manager.findMany({
    where: { isAdmin: false },
    select: { id: true },
  })
  const inPrior = new Set(orderedManagerIds)
  const extras = allManagers.filter((m) => !inPrior.has(m.id)).map((m) => m.id)
  const fullOrder = [...orderedManagerIds, ...extras]

  await initializeDraftSlots(contestId, fullOrder)
  return true
}

/**
 * Shuffle an array in place using Fisher-Yates.
 */
export function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
