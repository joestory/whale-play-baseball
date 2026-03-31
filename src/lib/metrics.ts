import type { MetricAggregationStep, MetricConfig, RelatedMetric } from '@/types'
import { normalizeTeam } from './constants'

type Row = Record<string, string>

type Accumulator = Map<string, number>

function runAggregation(rows: Row[], columns: Record<string, string>, steps: MetricAggregationStep[]): Accumulator {
  const acc: Accumulator = new Map()

  for (const row of rows) {
    for (const step of steps) {
      if (step.op === 'SUM') {
        const colName = columns[step.alias]
        const val = parseFloat(row[colName] ?? '0') || 0
        acc.set(step.alias, (acc.get(step.alias) ?? 0) + val)
      } else if (step.op === 'COUNT') {
        const colName = columns[step.alias]
        const present = row[colName] !== undefined && row[colName] !== '' ? 1 : 0
        acc.set(step.alias, (acc.get(step.alias) ?? 0) + present)
      }
    }
  }

  for (const step of steps) {
    if (step.op === 'DIV') {
      const num = acc.get(step.numerator) ?? 0
      const den = acc.get(step.denominator) ?? 0
      acc.set(step.alias, den === 0 ? 0 : (num / den) * (step.multiply ?? 1))
    }
  }

  return acc
}

function finalValue(acc: Accumulator, steps: MetricAggregationStep[]): number {
  const last = steps[steps.length - 1]
  return acc.get(last.alias) ?? 0
}

/**
 * Aggregate CSV rows by team according to the contest's metricConfig.
 * Returns a map of team code → final metric value.
 */
export function aggregateByTeam(rows: Row[], config: MetricConfig): Map<string, number> {
  const byTeam = new Map<string, Row[]>()

  for (const row of rows) {
    const team = normalizeTeam(row[config.teamColumn] ?? '')
    if (!team) continue
    if (!byTeam.has(team)) byTeam.set(team, [])
    byTeam.get(team)!.push(row)
  }

  const results = new Map<string, number>()
  for (const [team, teamRows] of byTeam) {
    const acc = runAggregation(teamRows, config.columns, config.aggregation)
    results.set(team, finalValue(acc, config.aggregation))
  }
  return results
}

/**
 * Aggregate CSV rows by team and date.
 * Returns team code → date string → cumulative metric value through that date.
 * Dates are sorted ascending and values are cumulative sums.
 */
export function aggregateByTeamAndDate(
  rows: Row[],
  config: MetricConfig
): Map<string, Record<string, number>> {
  if (!config.dateColumn) return new Map()

  // Group rows by team → date
  const byTeamDate = new Map<string, Map<string, Row[]>>()
  for (const row of rows) {
    const team = normalizeTeam(row[config.teamColumn] ?? '')
    if (!team) continue
    const date = (row[config.dateColumn] ?? '').slice(0, 10) // YYYY-MM-DD
    if (!date) continue
    if (!byTeamDate.has(team)) byTeamDate.set(team, new Map())
    const dateMap = byTeamDate.get(team)!
    if (!dateMap.has(date)) dateMap.set(date, [])
    dateMap.get(date)!.push(row)
  }

  const results = new Map<string, Record<string, number>>()
  for (const [team, dateMap] of byTeamDate) {
    const sortedDates = [...dateMap.keys()].sort()
    const daily: Record<string, number> = {}
    const accumulatedRows: Row[] = []
    for (const date of sortedDates) {
      // Accumulate all rows through this date, then apply aggregation once.
      // This ensures DIV metrics (K%, Whiff%, ERA) show running ratio, not summed ratios.
      accumulatedRows.push(...dateMap.get(date)!)
      const acc = runAggregation(accumulatedRows, config.columns, config.aggregation)
      daily[date] = finalValue(acc, config.aggregation)
    }
    results.set(team, daily)
  }
  return results
}

/**
 * Compute related metric values per team.
 * Returns team code → { metricName: value }
 */
export function aggregateRelatedByTeam(
  rows: Row[],
  config: MetricConfig
): Map<string, Record<string, number>> {
  if (!config.relatedMetrics?.length) return new Map()

  const byTeam = new Map<string, Row[]>()
  for (const row of rows) {
    const team = normalizeTeam(row[config.teamColumn] ?? '')
    if (!team) continue
    if (!byTeam.has(team)) byTeam.set(team, [])
    byTeam.get(team)!.push(row)
  }

  const results = new Map<string, Record<string, number>>()
  for (const [team, teamRows] of byTeam) {
    const related: Record<string, number> = {}
    for (const rm of config.relatedMetrics!) {
      const acc = runAggregation(teamRows, rm.columns, rm.aggregation)
      related[rm.name] = acc.get(rm.resultAlias) ?? 0
    }
    results.set(team, related)
  }
  return results
}

/**
 * For each tracked team, determine the opposing team per game date.
 *
 * Supports two CSV formats:
 *  A) Per-pitch/event: has home_team + away_team columns (uses config.teamColumn)
 *  B) Team-date aggregated (group_by=team-date): has player_name + game_pk;
 *     opponents share the same game_pk
 *
 * Returns empty map if neither format is detected (logos silently skipped).
 * For doubleheaders, the first opponent found per date wins.
 */
export function aggregateOpponentsByTeamAndDate(
  rows: Row[],
  config: MetricConfig
): Map<string, Record<string, string>> {
  const sample = rows[0]
  if (!sample || !config.dateColumn) return new Map()

  // Path A: per-pitch CSV with home_team / away_team columns
  if ('home_team' in sample && 'away_team' in sample) {
    const results = new Map<string, Record<string, string>>()
    for (const row of rows) {
      const trackedTeam = normalizeTeam(row[config.teamColumn] ?? '')
      if (!trackedTeam) continue
      const date = (row[config.dateColumn] ?? '').slice(0, 10)
      if (!date) continue
      const existing = results.get(trackedTeam)
      if (existing && date in existing) continue // doubleheader: first wins
      const homeTeam = normalizeTeam(row['home_team'] ?? '')
      const awayTeam = normalizeTeam(row['away_team'] ?? '')
      const opponent = trackedTeam === homeTeam ? awayTeam : homeTeam
      if (!opponent) continue
      if (!results.has(trackedTeam)) results.set(trackedTeam, {})
      results.get(trackedTeam)![date] = opponent
    }
    return results
  }

  // Path B: team-date aggregated CSV (group_by=team-date)
  // Team code is in player_name; two rows sharing game_pk are opponents
  if ('player_name' in sample && 'game_pk' in sample) {
    const gamePkTeams = new Map<string, string[]>()
    const teamDateGame = new Map<string, string>() // `${teamCode}|${date}` → game_pk

    for (const row of rows) {
      const teamCode = normalizeTeam(row['player_name'] ?? '')
      if (!teamCode) continue
      const date = (row[config.dateColumn] ?? '').slice(0, 10)
      if (!date) continue
      const gamePk = row['game_pk'] ?? ''
      if (!gamePk) continue

      const key = `${teamCode}|${date}`
      if (teamDateGame.has(key)) continue // doubleheader: first wins
      teamDateGame.set(key, gamePk)

      if (!gamePkTeams.has(gamePk)) gamePkTeams.set(gamePk, [])
      const teams = gamePkTeams.get(gamePk)!
      if (!teams.includes(teamCode)) teams.push(teamCode)
    }

    const results = new Map<string, Record<string, string>>()
    for (const [key, gamePk] of teamDateGame) {
      const pipeIdx = key.indexOf('|')
      const teamCode = key.slice(0, pipeIdx)
      const date = key.slice(pipeIdx + 1)
      const opponent = (gamePkTeams.get(gamePk) ?? []).find(t => t !== teamCode)
      if (!opponent) continue
      if (!results.has(teamCode)) results.set(teamCode, {})
      results.get(teamCode)![date] = opponent
    }
    return results
  }

  return new Map()
}

/**
 * Compute ranks from a map of managerId → metricValue.
 * Higher is better unless higherIsBetter is false.
 * Returns a map of managerId → rank (1-based).
 */
export function computeRanks(
  values: Map<string, number>,
  higherIsBetter = true
): Map<string, number> {
  const entries = [...values.entries()].sort((a, b) =>
    higherIsBetter ? b[1] - a[1] : a[1] - b[1]
  )

  const ranks = new Map<string, number>()
  let rank = 1
  entries.forEach(([id, val], i) => {
    if (i > 0 && val !== entries[i - 1][1]) rank = i + 1
    ranks.set(id, rank)
  })
  return ranks
}

export function parseMetricConfig(raw: unknown): MetricConfig {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Invalid metricConfig')
  }
  return raw as MetricConfig
}
