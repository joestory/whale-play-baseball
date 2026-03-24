import type { MetricAggregationStep, MetricConfig } from '@/types'
import { normalizeTeam } from './constants'

type Row = Record<string, string>

/**
 * Aggregate CSV rows by team according to the contest's metricConfig.
 * Returns a map of team code → final metric value.
 */
export function aggregateByTeam(rows: Row[], config: MetricConfig): Map<string, number> {
  const teamAccumulators = new Map<string, Map<string, number>>()

  // First pass: collect SUM/COUNT accumulations per team
  for (const row of rows) {
    const team = normalizeTeam(row[config.teamColumn] ?? '')
    if (!team) continue

    if (!teamAccumulators.has(team)) {
      teamAccumulators.set(team, new Map())
    }
    const acc = teamAccumulators.get(team)!

    for (const step of config.aggregation) {
      if (step.op === 'SUM') {
        const colName = config.columns[step.alias]
        const val = parseFloat(row[colName] ?? '0') || 0
        acc.set(step.alias, (acc.get(step.alias) ?? 0) + val)
      } else if (step.op === 'COUNT') {
        const colName = config.columns[step.alias]
        const val = row[colName] !== undefined && row[colName] !== '' ? 1 : 0
        acc.set(step.alias, (acc.get(step.alias) ?? 0) + val)
      }
      // DIV is handled in second pass
    }
  }

  // Second pass: apply DIV operations and extract final value
  const results = new Map<string, number>()

  for (const [team, acc] of teamAccumulators) {
    let finalValue: number | undefined

    for (const step of config.aggregation) {
      if (step.op === 'DIV') {
        const num = acc.get(step.numerator) ?? 0
        const den = acc.get(step.denominator) ?? 0
        const val = den === 0 ? 0 : (num / den) * (step.multiply ?? 1)
        acc.set(step.alias, val)
        finalValue = val
      } else {
        finalValue = acc.get(step.alias)
      }
    }

    if (finalValue !== undefined) {
      results.set(team, finalValue)
    }
  }

  return results
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
  entries.forEach(([id], i) => ranks.set(id, i + 1))
  return ranks
}

export function parseMetricConfig(raw: unknown): MetricConfig {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Invalid metricConfig')
  }
  return raw as MetricConfig
}
