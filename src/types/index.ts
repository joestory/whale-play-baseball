export type MetricAggregationStep =
  | { alias: string; op: 'SUM' | 'COUNT' }
  | {
      alias: string
      op: 'DIV'
      numerator: string
      denominator: string
      multiply?: number
    }

export type MetricConfig = {
  columns: Record<string, string> // alias → CSV column name e.g. { hr: "home_run" }
  teamColumn: string              // CSV column identifying the team e.g. "player_team"
  aggregation: MetricAggregationStep[]
  unit: string                    // display unit e.g. "HR" or "%"
  higherIsBetter?: boolean        // default true; false for metrics like ERA
}

// Example — Home Runs:
// {
//   columns: { hr: "home_run" },
//   teamColumn: "player_team",
//   aggregation: [{ alias: "hr", op: "SUM" }],
//   unit: "HR"
// }

// Example — HBP%:
// {
//   columns: { hbp: "hit_by_pitch", bf: "batters_faced" },
//   teamColumn: "player_team",
//   aggregation: [
//     { alias: "hbp", op: "SUM" },
//     { alias: "bf", op: "SUM" },
//     { alias: "result", op: "DIV", numerator: "hbp", denominator: "bf", multiply: 100 }
//   ],
//   unit: "%"
// }

export type DraftState = {
  contestId: string
  eligibleManagerIds: string[]
  picks: { managerId: string; teamCode: string; pickedAt: string }[]
  slots: { managerId: string; pickOrder: number; eligibleAt: string; pickedAt: string | null }[]
}

export type TeamInfo = {
  code: string
  name: string
  city: string
  abbreviation: string
}
