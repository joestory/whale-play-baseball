import type { TeamInfo } from '@/types'

// Logo URLs: MLB's official SVG logos via mlbstatic.com CDN
// Team IDs sourced from the MLB Stats API (statsapi.mlb.com/api/v1/teams)
// Primary colors: official team brand hex values

export const MLB_TEAMS: TeamInfo[] = [
  { code: 'ARI', name: 'Arizona Diamondbacks',  city: 'Arizona',       abbreviation: 'ARI', logo: 'https://www.mlbstatic.com/team-logos/109.svg', primaryColor: '#A71930' },
  { code: 'ATL', name: 'Atlanta Braves',         city: 'Atlanta',       abbreviation: 'ATL', logo: 'https://www.mlbstatic.com/team-logos/144.svg', primaryColor: '#CE1141' },
  { code: 'BAL', name: 'Baltimore Orioles',      city: 'Baltimore',     abbreviation: 'BAL', logo: 'https://www.mlbstatic.com/team-logos/110.svg', primaryColor: '#DF4601' },
  { code: 'BOS', name: 'Boston Red Sox',         city: 'Boston',        abbreviation: 'BOS', logo: 'https://www.mlbstatic.com/team-logos/111.svg', primaryColor: '#BD3039' },
  { code: 'CHC', name: 'Chicago Cubs',           city: 'Chicago',       abbreviation: 'CHC', logo: 'https://www.mlbstatic.com/team-logos/112.svg', primaryColor: '#0E3386' },
  { code: 'CWS', name: 'Chicago White Sox',      city: 'Chicago',       abbreviation: 'CWS', logo: 'https://www.mlbstatic.com/team-logos/145.svg', primaryColor: '#27251F' },
  { code: 'CIN', name: 'Cincinnati Reds',        city: 'Cincinnati',    abbreviation: 'CIN', logo: 'https://www.mlbstatic.com/team-logos/113.svg', primaryColor: '#C6011F' },
  { code: 'CLE', name: 'Cleveland Guardians',    city: 'Cleveland',     abbreviation: 'CLE', logo: 'https://www.mlbstatic.com/team-logos/114.svg', primaryColor: '#00385D' },
  { code: 'COL', name: 'Colorado Rockies',       city: 'Colorado',      abbreviation: 'COL', logo: 'https://www.mlbstatic.com/team-logos/115.svg', primaryColor: '#333366' },
  { code: 'DET', name: 'Detroit Tigers',         city: 'Detroit',       abbreviation: 'DET', logo: 'https://www.mlbstatic.com/team-logos/116.svg', primaryColor: '#0C2340' },
  { code: 'HOU', name: 'Houston Astros',         city: 'Houston',       abbreviation: 'HOU', logo: 'https://www.mlbstatic.com/team-logos/117.svg', primaryColor: '#002D62' },
  { code: 'KC',  name: 'Kansas City Royals',     city: 'Kansas City',   abbreviation: 'KC',  logo: 'https://www.mlbstatic.com/team-logos/118.svg', primaryColor: '#004687' },
  { code: 'LAA', name: 'Los Angeles Angels',     city: 'Los Angeles',   abbreviation: 'LAA', logo: 'https://www.mlbstatic.com/team-logos/108.svg', primaryColor: '#BA0021' },
  { code: 'LAD', name: 'Los Angeles Dodgers',    city: 'Los Angeles',   abbreviation: 'LAD', logo: 'https://www.mlbstatic.com/team-logos/119.svg', primaryColor: '#005A9C' },
  { code: 'MIA', name: 'Miami Marlins',          city: 'Miami',         abbreviation: 'MIA', logo: 'https://www.mlbstatic.com/team-logos/146.svg', primaryColor: '#00A3E0' },
  { code: 'MIL', name: 'Milwaukee Brewers',      city: 'Milwaukee',     abbreviation: 'MIL', logo: 'https://www.mlbstatic.com/team-logos/158.svg', primaryColor: '#12284B' },
  { code: 'MIN', name: 'Minnesota Twins',        city: 'Minnesota',     abbreviation: 'MIN', logo: 'https://www.mlbstatic.com/team-logos/142.svg', primaryColor: '#002B5C' },
  { code: 'NYM', name: 'New York Mets',          city: 'New York',      abbreviation: 'NYM', logo: 'https://www.mlbstatic.com/team-logos/121.svg', primaryColor: '#002D72' },
  { code: 'NYY', name: 'New York Yankees',       city: 'New York',      abbreviation: 'NYY', logo: 'https://www.mlbstatic.com/team-logos/147.svg', primaryColor: '#003087' },
  { code: 'OAK', name: 'Athletics',             city: 'Oakland',       abbreviation: 'OAK', logo: 'https://www.mlbstatic.com/team-logos/133.svg', primaryColor: '#003831' },
  { code: 'PHI', name: 'Philadelphia Phillies',  city: 'Philadelphia',  abbreviation: 'PHI', logo: 'https://www.mlbstatic.com/team-logos/143.svg', primaryColor: '#E81828' },
  { code: 'PIT', name: 'Pittsburgh Pirates',     city: 'Pittsburgh',    abbreviation: 'PIT', logo: 'https://www.mlbstatic.com/team-logos/134.svg', primaryColor: '#27251F' },
  { code: 'SD',  name: 'San Diego Padres',       city: 'San Diego',     abbreviation: 'SD',  logo: 'https://www.mlbstatic.com/team-logos/135.svg', primaryColor: '#2F241D' },
  { code: 'SF',  name: 'San Francisco Giants',   city: 'San Francisco', abbreviation: 'SF',  logo: 'https://www.mlbstatic.com/team-logos/137.svg', primaryColor: '#FD5A1E' },
  { code: 'SEA', name: 'Seattle Mariners',       city: 'Seattle',       abbreviation: 'SEA', logo: 'https://www.mlbstatic.com/team-logos/136.svg', primaryColor: '#0C2C56' },
  { code: 'STL', name: 'St. Louis Cardinals',    city: 'St. Louis',     abbreviation: 'STL', logo: 'https://www.mlbstatic.com/team-logos/138.svg', primaryColor: '#C41E3A' },
  { code: 'TB',  name: 'Tampa Bay Rays',         city: 'Tampa Bay',     abbreviation: 'TB',  logo: 'https://www.mlbstatic.com/team-logos/139.svg', primaryColor: '#092C5C' },
  { code: 'TEX', name: 'Texas Rangers',          city: 'Texas',         abbreviation: 'TEX', logo: 'https://www.mlbstatic.com/team-logos/140.svg', primaryColor: '#003278' },
  { code: 'TOR', name: 'Toronto Blue Jays',      city: 'Toronto',       abbreviation: 'TOR', logo: 'https://www.mlbstatic.com/team-logos/141.svg', primaryColor: '#134A8E' },
  { code: 'WSH', name: 'Washington Nationals',   city: 'Washington',    abbreviation: 'WSH', logo: 'https://www.mlbstatic.com/team-logos/120.svg', primaryColor: '#AB0003' },
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
