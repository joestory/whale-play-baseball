import { describe, it, expect } from 'vitest'
import { aggregateByTeamAndDate } from './metrics'
import type { MetricConfig } from '@/types'

// K% = strikeouts / plate_appearances (as %)
const kPctConfig: MetricConfig = {
  columns: { k: 'so', pa: 'pa' },
  teamColumn: 'team',
  dateColumn: 'date',
  aggregation: [
    { alias: 'k', op: 'SUM' },
    { alias: 'pa', op: 'SUM' },
    { alias: 'kpct', op: 'DIV', numerator: 'k', denominator: 'pa', multiply: 100 },
  ],
  unit: '%',
}

describe('aggregateByTeamAndDate — DIV metric accumulation', () => {
  it('shows running ratio, not sum of per-day ratios', () => {
    // Day 1: 3 K in 9 PA = 33.3%
    // Day 2: 3 K in 6 PA (cumulative: 6 K in 15 PA = 40%)
    // Bug (old): 33.3 + 66.7 = 100% on day 2
    // Fix (new): 6/15*100 = 40% on day 2
    const rows = [
      { team: 'NYY', date: '2026-03-20', so: '1', pa: '3' },
      { team: 'NYY', date: '2026-03-20', so: '1', pa: '3' },
      { team: 'NYY', date: '2026-03-20', so: '1', pa: '3' },
      { team: 'NYY', date: '2026-03-21', so: '2', pa: '3' },
      { team: 'NYY', date: '2026-03-21', so: '1', pa: '3' },
    ]

    const result = aggregateByTeamAndDate(rows, kPctConfig)
    const nyyDaily = result.get('NYY')!

    // Day 1: 3/9 = 33.33%
    expect(nyyDaily['2026-03-20']).toBeCloseTo(33.33, 1)

    // Day 2 (cumulative): 6/15 = 40%, NOT the bugged (33.3 + 66.7) = 100%
    expect(nyyDaily['2026-03-21']).toBeCloseTo(40, 1)
    expect(nyyDaily['2026-03-21']).toBeLessThan(50)
  })

  it('returns correct daily cumulative for a SUM metric (unchanged behavior)', () => {
    const hrConfig: MetricConfig = {
      columns: { hr: 'home_run' },
      teamColumn: 'team',
      dateColumn: 'date',
      aggregation: [{ alias: 'hr', op: 'SUM' }],
      unit: 'HR',
    }

    const rows = [
      { team: 'BOS', date: '2026-03-20', home_run: '2' },
      { team: 'BOS', date: '2026-03-21', home_run: '3' },
      { team: 'BOS', date: '2026-03-22', home_run: '1' },
    ]

    const result = aggregateByTeamAndDate(rows, hrConfig)
    const bosDaily = result.get('BOS')!

    expect(bosDaily['2026-03-20']).toBe(2)
    expect(bosDaily['2026-03-21']).toBe(5) // cumulative
    expect(bosDaily['2026-03-22']).toBe(6) // cumulative
  })

  it('handles missing dateColumn by returning empty map', () => {
    const config: MetricConfig = {
      columns: { hr: 'home_run' },
      teamColumn: 'team',
      aggregation: [{ alias: 'hr', op: 'SUM' }],
      unit: 'HR',
    }
    const result = aggregateByTeamAndDate([{ team: 'NYY', home_run: '1' }], config)
    expect(result.size).toBe(0)
  })

  it('handles denominator-zero for DIV by returning 0 not NaN', () => {
    const rows = [{ team: 'SEA', date: '2026-03-20', so: '3', pa: '0' }]
    const result = aggregateByTeamAndDate(rows, kPctConfig)
    const seaDaily = result.get('SEA')!
    expect(seaDaily['2026-03-20']).toBe(0)
    expect(Number.isNaN(seaDaily['2026-03-20'])).toBe(false)
  })
})
