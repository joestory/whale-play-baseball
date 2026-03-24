import { prisma } from './db'

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
