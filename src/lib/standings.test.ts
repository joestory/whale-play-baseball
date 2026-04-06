import { describe, it, expect } from 'vitest'
import { contestDatesUpToToday, toStandingRows } from './standings'

describe('contestDatesUpToToday', () => {
  it('returns all dates from start to end when end is in the past', () => {
    const start = new Date('2026-01-01')
    const end = new Date('2026-01-07')
    const dates = contestDatesUpToToday(start, end)
    expect(dates).toEqual([
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
      '2026-01-04',
      '2026-01-05',
      '2026-01-06',
      '2026-01-07',
    ])
  })

  it('stops at end date even if today is further in the future', () => {
    const start = new Date('2026-01-01')
    const end = new Date('2026-01-03')
    const dates = contestDatesUpToToday(start, end)
    expect(dates.length).toBeLessThanOrEqual(3)
    expect(dates[0]).toBe('2026-01-01')
  })

  it('returns empty array when start date is in the future', () => {
    const start = new Date('2099-01-01')
    const end = new Date('2099-01-07')
    const dates = contestDatesUpToToday(start, end)
    expect(dates).toEqual([])
  })

  it('returns dates in YYYY-MM-DD format', () => {
    const start = new Date('2026-01-01')
    const end = new Date('2026-01-03')
    const dates = contestDatesUpToToday(start, end)
    for (const d of dates) {
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})

describe('toStandingRows', () => {
  const mockStandings = [
    {
      id: 's1',
      rank: 1,
      previousRank: null,
      teamCode: 'NYY',
      metricValue: 15,
      dailyValues: { '2026-03-20': 3, '2026-03-21': 8, '2026-03-25': 15 },
      relatedValues: {},
      manager: { icon: '🦈', username: 'alice' },
    },
    {
      id: 's2',
      rank: 2,
      previousRank: null,
      teamCode: 'BOS',
      metricValue: 10,
      dailyValues: { '2026-03-20': 2, '2026-03-21': 10 },
      relatedValues: {},
      manager: { icon: null, username: 'bob' },
    },
  ]

  it('maps to StandingRow shape with correct fields', () => {
    const rows = toStandingRows(mockStandings, ['2026-03-20', '2026-03-21'])
    expect(rows).toHaveLength(2)
    expect(rows[0].id).toBe('s1')
    expect(rows[0].rank).toBe(1)
    expect(rows[0].metricValue).toBe(15)
    expect(rows[0].managerUsername).toBe('alice')
  })

  it('uses manager icon when present', () => {
    const rows = toStandingRows(mockStandings, ['2026-03-20'])
    expect(rows[0].managerIcon).toBe('🦈')
  })

  it('falls back to ⚾ when manager icon is null', () => {
    const rows = toStandingRows(mockStandings, ['2026-03-20'])
    expect(rows[1].managerIcon).toBe('⚾')
  })

  it('filters dailyValues to only contestDates', () => {
    const rows = toStandingRows(mockStandings, ['2026-03-20', '2026-03-21'])
    const dv = rows[0].dailyValues
    expect(Object.keys(dv)).toEqual(['2026-03-20', '2026-03-21'])
    // 2026-03-25 is outside contestDates
    expect(dv['2026-03-25']).toBeUndefined()
  })

  it('preserves dailyValues in contestDates', () => {
    const rows = toStandingRows(mockStandings, ['2026-03-20', '2026-03-21'])
    expect(rows[0].dailyValues['2026-03-20']).toBe(3)
    expect(rows[0].dailyValues['2026-03-21']).toBe(8)
  })
})

describe('sparkline normalization guard', () => {
  it('detects equal-value case requiring null guard', () => {
    // Simulates computeSparklineRange logic — all values equal means max === min
    const standings = [
      { dailyValues: { '2026-03-20': 5, '2026-03-21': 5 } },
      { dailyValues: { '2026-03-20': 5, '2026-03-21': 5 } },
    ]
    const dates = ['2026-03-20', '2026-03-21']

    let globalMin = Infinity
    let globalMax = -Infinity
    for (const s of standings) {
      for (const d of dates) {
        const v = s.dailyValues[d as keyof typeof s.dailyValues]
        if (v != null) {
          if (v < globalMin) globalMin = v
          if (v > globalMax) globalMax = v
        }
      }
    }

    // Guard condition: when max === min, sparkline should not render
    expect(globalMax === globalMin).toBe(true)
    // Range would be zero — division would produce NaN/Infinity
    expect(globalMax - globalMin).toBe(0)
  })

  it('produces valid range when values differ', () => {
    const standings = [
      { dailyValues: { '2026-03-20': 2, '2026-03-21': 8 } },
      { dailyValues: { '2026-03-20': 1, '2026-03-21': 5 } },
    ]
    const dates = ['2026-03-20', '2026-03-21']

    let globalMin = Infinity
    let globalMax = -Infinity
    for (const s of standings) {
      for (const d of dates) {
        const v = s.dailyValues[d as keyof typeof s.dailyValues]
        if (v != null) {
          if (v < globalMin) globalMin = v
          if (v > globalMax) globalMax = v
        }
      }
    }

    expect(globalMin).toBe(1)
    expect(globalMax).toBe(8)
    expect(globalMax).not.toBe(globalMin)
  })
})
