import { getTeam } from './constants'
import type { StandingRow } from '@/types'

/**
 * Returns dates from startDate through min(today in ET, endDate), inclusive.
 * Uses Eastern time to match Baseball Savant's data cadence (games end ET).
 */
export function contestDatesUpToToday(startDate: Date, endDate: Date): string[] {
  const todayET = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
  }).format(new Date()) // en-CA locale returns YYYY-MM-DD

  const dates: string[] = []
  const cursor = new Date(startDate)
  while (cursor <= endDate) {
    const d = cursor.toISOString().slice(0, 10)
    if (d > todayET) break
    dates.push(d)
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

type RawStanding = {
  id: string
  rank: number | null
  teamCode: string
  metricValue: number
  dailyValues: unknown
  relatedValues: unknown
  manager: { icon: string | null; username: string }
}

/**
 * Map raw Prisma standings to StandingRow[], filtering dailyValues to contestDates.
 */
export function toStandingRows(standings: RawStanding[], contestDates: string[]): StandingRow[] {
  const dateSet = new Set(contestDates)
  return standings.map((s) => {
    const team = getTeam(s.teamCode)
    const raw = (s.dailyValues ?? {}) as Record<string, number>
    return {
      id: s.id,
      rank: s.rank,
      managerIcon: s.manager.icon ?? '⚾',
      managerUsername: s.manager.username,
      teamCode: s.teamCode,
      teamName: team?.name ?? s.teamCode,
      teamLogo: team?.logo ?? '',
      metricValue: s.metricValue,
      dailyValues: Object.fromEntries(Object.entries(raw).filter(([d]) => dateSet.has(d))),
      relatedValues: (s.relatedValues ?? {}) as Record<string, number>,
    }
  })
}
