export type MetricAggregationStep =
  | { alias: string; op: 'SUM' | 'COUNT' }
  | {
      alias: string
      op: 'DIV'
      numerator: string
      denominator: string
      multiply?: number
    }

export type RelatedMetric = {
  name: string
  columns: Record<string, string>
  aggregation: MetricAggregationStep[]
  resultAlias: string // which alias holds the final display value
  unit: string
}

export type MetricConfig = {
  columns: Record<string, string> // alias → CSV column name e.g. { hr: "home_run" }
  teamColumn: string              // CSV column identifying the team e.g. "player_team"
  dateColumn?: string             // CSV column for game date, used for daily tracking e.g. "game_date"
  aggregation: MetricAggregationStep[]
  unit: string                    // display unit e.g. "HR" or "%"
  higherIsBetter?: boolean        // default true; false for metrics like ERA
  relatedMetrics?: RelatedMetric[]
}

export type DraftState = {
  contestId: string
  eligibleManagerIds: string[]
  picks: { managerId: string; teamCode: string; pickedAt: string }[]
  slots: { managerId: string; pickOrder: number; eligibleAt: string; pickedAt: string | null }[]
}

export type StandingRow = {
  id: string
  rank: number | null
  managerIcon: string
  managerUsername: string
  teamCode: string
  teamName: string
  teamLogo: string
  metricValue: number
  dailyValues: Record<string, number>
  relatedValues: Record<string, number>
  dailyOpponents?: Record<string, string>
}

export type TeamInfo = {
  code: string
  name: string
  city: string
  abbreviation: string
  logo: string
  primaryColor: string
}
