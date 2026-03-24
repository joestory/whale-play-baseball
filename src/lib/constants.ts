import type { TeamInfo } from '@/types'

export const MLB_TEAMS: TeamInfo[] = [
  { code: 'ARI', name: 'Arizona Diamondbacks', city: 'Arizona', abbreviation: 'ARI' },
  { code: 'ATL', name: 'Atlanta Braves', city: 'Atlanta', abbreviation: 'ATL' },
  { code: 'BAL', name: 'Baltimore Orioles', city: 'Baltimore', abbreviation: 'BAL' },
  { code: 'BOS', name: 'Boston Red Sox', city: 'Boston', abbreviation: 'BOS' },
  { code: 'CHC', name: 'Chicago Cubs', city: 'Chicago', abbreviation: 'CHC' },
  { code: 'CWS', name: 'Chicago White Sox', city: 'Chicago', abbreviation: 'CWS' },
  { code: 'CIN', name: 'Cincinnati Reds', city: 'Cincinnati', abbreviation: 'CIN' },
  { code: 'CLE', name: 'Cleveland Guardians', city: 'Cleveland', abbreviation: 'CLE' },
  { code: 'COL', name: 'Colorado Rockies', city: 'Colorado', abbreviation: 'COL' },
  { code: 'DET', name: 'Detroit Tigers', city: 'Detroit', abbreviation: 'DET' },
  { code: 'HOU', name: 'Houston Astros', city: 'Houston', abbreviation: 'HOU' },
  { code: 'KC',  name: 'Kansas City Royals', city: 'Kansas City', abbreviation: 'KC' },
  { code: 'LAA', name: 'Los Angeles Angels', city: 'Los Angeles', abbreviation: 'LAA' },
  { code: 'LAD', name: 'Los Angeles Dodgers', city: 'Los Angeles', abbreviation: 'LAD' },
  { code: 'MIA', name: 'Miami Marlins', city: 'Miami', abbreviation: 'MIA' },
  { code: 'MIL', name: 'Milwaukee Brewers', city: 'Milwaukee', abbreviation: 'MIL' },
  { code: 'MIN', name: 'Minnesota Twins', city: 'Minnesota', abbreviation: 'MIN' },
  { code: 'NYM', name: 'New York Mets', city: 'New York', abbreviation: 'NYM' },
  { code: 'NYY', name: 'New York Yankees', city: 'New York', abbreviation: 'NYY' },
  { code: 'OAK', name: 'Oakland Athletics', city: 'Oakland', abbreviation: 'OAK' },
  { code: 'PHI', name: 'Philadelphia Phillies', city: 'Philadelphia', abbreviation: 'PHI' },
  { code: 'PIT', name: 'Pittsburgh Pirates', city: 'Pittsburgh', abbreviation: 'PIT' },
  { code: 'SD',  name: 'San Diego Padres', city: 'San Diego', abbreviation: 'SD' },
  { code: 'SF',  name: 'San Francisco Giants', city: 'San Francisco', abbreviation: 'SF' },
  { code: 'SEA', name: 'Seattle Mariners', city: 'Seattle', abbreviation: 'SEA' },
  { code: 'STL', name: 'St. Louis Cardinals', city: 'St. Louis', abbreviation: 'STL' },
  { code: 'TB',  name: 'Tampa Bay Rays', city: 'Tampa Bay', abbreviation: 'TB' },
  { code: 'TEX', name: 'Texas Rangers', city: 'Texas', abbreviation: 'TEX' },
  { code: 'TOR', name: 'Toronto Blue Jays', city: 'Toronto', abbreviation: 'TOR' },
  { code: 'WSH', name: 'Washington Nationals', city: 'Washington', abbreviation: 'WSH' },
]

// Baseball Savant sometimes uses different abbreviations — normalize them here
export const SAVANT_TEAM_MAP: Record<string, string> = {
  ARI: 'ARI',
  ATL: 'ATL',
  BAL: 'BAL',
  BOS: 'BOS',
  CHC: 'CHC',
  CWS: 'CWS',
  CIN: 'CIN',
  CLE: 'CLE',
  COL: 'COL',
  DET: 'DET',
  HOU: 'HOU',
  KC:  'KC',
  LAA: 'LAA',
  LAD: 'LAD',
  MIA: 'MIA',
  MIL: 'MIL',
  MIN: 'MIN',
  NYM: 'NYM',
  NYY: 'NYY',
  OAK: 'OAK',
  PHI: 'PHI',
  PIT: 'PIT',
  SD:  'SD',
  SF:  'SF',
  SEA: 'SEA',
  STL: 'STL',
  TB:  'TB',
  TEX: 'TEX',
  TOR: 'TOR',
  WSH: 'WSH',
  WAS: 'WSH', // alternate Savant abbreviation
}

export function normalizeTeam(raw: string): string {
  return SAVANT_TEAM_MAP[raw?.toUpperCase()] ?? raw?.toUpperCase()
}

export function getTeam(code: string): TeamInfo | undefined {
  return MLB_TEAMS.find((t) => t.code === code)
}
