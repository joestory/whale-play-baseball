import type { MetricAggregationStep, MetricConfig, RelatedMetric } from '@/types'
import { normalizeTeam, MLB_TEAMS } from './constants'

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
export async function aggregateOpponentsByTeamAndDate(
  rows: Row[],
  config: MetricConfig
): Promise<Map<string, Record<string, string>>> {
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
  // Team code is in player_name; two rows sharing game_pk are opponents.
  // When a team had 0 events (e.g. 0 HRs), they don't appear in the CSV —
  // fall back to the MLB Stats API to resolve missing opponents.
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
      if (!teamDateGame.has(key)) teamDateGame.set(key, gamePk)

      if (!gamePkTeams.has(gamePk)) gamePkTeams.set(gamePk, [])
      const teams = gamePkTeams.get(gamePk)!
      if (!teams.includes(teamCode)) teams.push(teamCode)
    }

    // For game_pks where only one team appeared, the opponent had 0 events
    // and is absent from the CSV. Look them up via the MLB Stats API.
    const incompleteGamePks = [...gamePkTeams.keys()].filter(
      pk => (gamePkTeams.get(pk)?.length ?? 0) < 2
    )

    if (incompleteGamePks.length > 0) {
      try {
        // Build mlbId → teamCode map from logo URLs (e.g. .../team-logos/147.svg → NYY)
        const mlbIdToCode = new Map<number, string>()
        for (const team of MLB_TEAMS) {
          const m = team.logo.match(/\/(\d+)\.svg$/)
          if (m) mlbIdToCode.set(parseInt(m[1]), team.code)
        }

        const url = `https://statsapi.mlb.com/api/v1/schedule?gamePks=${incompleteGamePks.join(',')}`
        const res = await fetch(url, { headers: { 'User-Agent': 'WhalePlayBaseball/1.0' } })
        if (res.ok) {
          const data = await res.json() as {
            dates?: { games?: { gamePk: number; teams: { home: { team: { id: number } }; away: { team: { id: number } } } }[] }[]
          }
          for (const dateEntry of data.dates ?? []) {
            for (const game of dateEntry.games ?? []) {
              const pk = String(game.gamePk)
              const homeCode = mlbIdToCode.get(game.teams.home.team.id)
              const awayCode = mlbIdToCode.get(game.teams.away.team.id)
              if (!homeCode || !awayCode || !gamePkTeams.has(pk)) continue
              const teams = gamePkTeams.get(pk)!
              if (!teams.includes(homeCode)) teams.push(homeCode)
              if (!teams.includes(awayCode)) teams.push(awayCode)
            }
          }
        }
      } catch {
        // Gracefully degrade — partial opponents still show for games where both teams had events
      }
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
