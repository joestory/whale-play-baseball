import { describe, it, expect } from 'vitest'
import {
  formatValue,
  espnLogoUrl,
  daysColor,
  metricDelta,
  buildPrevRankMap,
} from './opengraph-image'

describe('formatValue', () => {
  it('returns integer as a plain string (no decimal)', () => {
    expect(formatValue(47)).toBe('47')
    expect(formatValue(0)).toBe('0')
  })

  it('returns decimal formatted to 2 places', () => {
    expect(formatValue(47.5)).toBe('47.50')
    expect(formatValue(0.1)).toBe('0.10')
    expect(formatValue(3.14159)).toBe('3.14')
  })

  it('returns "—" for NaN or Infinity instead of rendering literally', () => {
    expect(formatValue(NaN)).toBe('—')
    expect(formatValue(Infinity)).toBe('—')
    expect(formatValue(-Infinity)).toBe('—')
  })
})

describe('espnLogoUrl', () => {
  it('returns lowercase ESPN PNG URL for a standard team code', () => {
    expect(espnLogoUrl('LAD')).toBe(
      'https://a.espncdn.com/i/teamlogos/mlb/500/scoreboard/lad.png'
    )
    expect(espnLogoUrl('NYY')).toBe(
      'https://a.espncdn.com/i/teamlogos/mlb/500/scoreboard/nyy.png'
    )
  })

  it('applies the CWS → chw override', () => {
    expect(espnLogoUrl('CWS')).toBe(
      'https://a.espncdn.com/i/teamlogos/mlb/500/scoreboard/chw.png'
    )
  })
})

describe('daysColor', () => {
  it('returns red for 1 day', () => {
    expect(daysColor(1)).toBe('#f87171')
  })

  it('returns orange for 2 days', () => {
    expect(daysColor(2)).toBe('#fb923c')
  })

  it('returns yellow for 3 days', () => {
    expect(daysColor(3)).toBe('#fbbf24')
  })

  it('returns zinc for 4+ days', () => {
    expect(daysColor(4)).toBe('#71717a')
    expect(daysColor(100)).toBe('#71717a')
  })
})

describe('metricDelta', () => {
  it('returns null for null/undefined input', () => {
    expect(metricDelta(null)).toBeNull()
    expect(metricDelta(undefined)).toBeNull()
  })

  it('returns null when fewer than 2 dates exist', () => {
    expect(metricDelta({})).toBeNull()
    expect(metricDelta({ '2025-04-01': 5 })).toBeNull()
  })

  it('returns latest minus previous for 2+ dates', () => {
    const vals = { '2025-04-01': 5, '2025-04-02': 8 }
    expect(metricDelta(vals)).toBe(3)
  })

  it('returns negative delta when value drops', () => {
    const vals = { '2025-04-01': 10, '2025-04-02': 7 }
    expect(metricDelta(vals)).toBe(-3)
  })

  it('uses the two most recent dates when 3+ dates exist', () => {
    const vals = { '2025-04-01': 5, '2025-04-02': 8, '2025-04-03': 11 }
    expect(metricDelta(vals)).toBe(3) // 11 - 8
  })

  it('returns 0 (not null) when value is flat', () => {
    const vals = { '2025-04-01': 10, '2025-04-02': 10 }
    expect(metricDelta(vals)).toBe(0)
  })
})

describe('buildPrevRankMap', () => {
  it('returns empty map when fewer than 2 dates exist across all standings', () => {
    const standings = [
      { id: 'a', dailyValues: { '2025-04-01': 10 } },
      { id: 'b', dailyValues: { '2025-04-01': 8 } },
    ]
    const map = buildPrevRankMap(standings)
    expect(map.size).toBe(0)
  })

  it('assigns rank 1 to the highest previous value', () => {
    const standings = [
      { id: 'a', dailyValues: { '2025-04-01': 10, '2025-04-02': 12 } },
      { id: 'b', dailyValues: { '2025-04-01': 8, '2025-04-02': 15 } },
    ]
    const map = buildPrevRankMap(standings)
    // prevDate is '2025-04-01': a=10 (rank 1), b=8 (rank 2)
    expect(map.get('a')).toBe(1)
    expect(map.get('b')).toBe(2)
  })

  it('assigns the same rank to tied values', () => {
    const standings = [
      { id: 'a', dailyValues: { '2025-04-01': 10, '2025-04-02': 12 } },
      { id: 'b', dailyValues: { '2025-04-01': 10, '2025-04-02': 9 } },
      { id: 'c', dailyValues: { '2025-04-01': 5, '2025-04-02': 8 } },
    ]
    const map = buildPrevRankMap(standings)
    // prevDate: a=10, b=10 (both rank 1), c=5 (rank 3)
    expect(map.get('a')).toBe(1)
    expect(map.get('b')).toBe(1)
    expect(map.get('c')).toBe(3)
  })
})
