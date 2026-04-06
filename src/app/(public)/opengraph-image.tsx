import { ImageResponse } from 'next/og'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export function formatValue(v: number) {
  if (!isFinite(v)) return '—'
  return v % 1 === 0 ? String(v) : v.toFixed(2)
}

export function espnLogoUrl(code: string): string {
  const overrides: Record<string, string> = { CWS: 'chw' }
  return `https://a.espncdn.com/i/teamlogos/mlb/500/scoreboard/${(overrides[code] ?? code).toLowerCase()}.png`
}

export function daysColor(days: number): string {
  if (days === 1) return '#f87171'
  if (days === 2) return '#fb923c'
  if (days === 3) return '#fbbf24'
  return '#71717a'
}

export function metricDelta(dailyValues: unknown): number | null {
  const vals = (dailyValues ?? {}) as Record<string, number>
  const dates = Object.keys(vals).sort()
  if (dates.length < 2) return null
  const latest = vals[dates[dates.length - 1]]
  const prev = vals[dates[dates.length - 2]]
  return latest != null && prev != null ? latest - prev : null
}

export function buildPrevRankMap(
  standings: Array<{ id: string; dailyValues: unknown }>
): Map<string, number> {
  const rows = standings.map((s) => ({
    id: s.id,
    vals: (s.dailyValues ?? {}) as Record<string, number>,
  }))
  const allDates = [...new Set(rows.flatMap((r) => Object.keys(r.vals)))].sort()
  const prevDate = allDates[allDates.length - 2]
  if (!prevDate) return new Map()

  const sorted = rows
    .map((r) => ({ id: r.id, v: r.vals[prevDate] ?? 0 }))
    .sort((a, b) => b.v - a.v)

  const map = new Map<string, number>()
  sorted.forEach((x, i) => {
    const rank =
      i === 0
        ? 1
        : sorted[i].v === sorted[i - 1].v
        ? (map.get(sorted[i - 1].id) ?? i + 1)
        : i + 1
    map.set(x.id, rank)
  })
  return map
}

export default async function Image() {
  const contest = await prisma.contest.findFirst({
    where: { status: { in: ['ACTIVE', 'DRAFTING'] } },
    orderBy: [{ season: 'desc' }, { contestNumber: 'desc' }],
    include: {
      standings: {
        orderBy: { rank: 'asc' },
        include: { manager: { select: { username: true } } },
      },
      picks: { select: { managerId: true } },
    },
  })

  const title = contest
    ? `${contest.name} — Contest ${contest.contestNumber}`
    : 'Whale Play Baseball'
  const metricName = contest?.metricName ?? 'Fantasy Baseball Weekly Draft League'

  const pickedIds = new Set(contest?.picks.map((p) => p.managerId) ?? [])
  const pickedStandings = (contest?.standings ?? []).filter((s) => pickedIds.has(s.managerId))
  const top3 = pickedStandings.slice(0, 3)
  const prevRankMap = buildPrevRankMap(pickedStandings)

  const todayEastern = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const endMs = contest != null ? new Date(contest.endDate).getTime() : NaN
  const daysRemaining = isFinite(endMs)
    ? Math.round((endMs - new Date(todayEastern).getTime()) / 86400000) + 1
    : null
  const showDays = daysRemaining != null && daysRemaining > 0

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: '#0a0a0a',
          display: 'flex',
          flexDirection: 'column',
          padding: '56px 72px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Title */}
        <div style={{ color: '#ffffff', fontSize: 48, fontWeight: 700, lineHeight: 1.1, marginBottom: 10 }}>
          {title}
        </div>

        {/* Metric name */}
        <div style={{ color: '#a1a1aa', fontSize: 34, fontWeight: 500, marginBottom: showDays ? 6 : 36 }}>
          {metricName}
        </div>

        {/* Days remaining */}
        {showDays && (
          <div style={{ color: daysColor(daysRemaining!), fontSize: 34, fontWeight: 500, marginBottom: 36 }}>
            {`${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining`}
          </div>
        )}

        {/* 3-column standings */}
        {top3.length > 0 && (
          <div style={{ display: 'flex', gap: 24, flex: 1 }}>
            {top3.map((s, i) => {
              const prevRank = prevRankMap.get(s.id)
              const rankDelta = prevRank != null && s.rank != null ? prevRank - s.rank : null
              const rankColor =
                rankDelta == null ? '#71717a'
                : rankDelta > 0   ? '#4ade80'
                : rankDelta < 0   ? '#fb7185'
                :                   '#71717a'

              const delta = metricDelta(s.dailyValues)
              const trendColor = delta != null && delta < 0 ? '#fb7185' : '#4ade80'
              const trendCaret = delta != null && delta !== 0 ? (delta > 0 ? '▲' : '▼') : null
              const rankLabel = s.rank != null ? String(s.rank) : String(i + 1)

              return (
                <div
                  key={s.id}
                  style={{
                    flex: 1,
                    background: '#111111',
                    border: '1px solid #1f1f1f',
                    borderRadius: 16,
                    padding: '20px 20px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  {/* Rank + username */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ color: rankColor, fontSize: 45, fontWeight: 900, minWidth: 44, textAlign: 'center' }}>
                      {rankLabel}
                    </span>
                    <span style={{ color: '#e4e4e7', fontSize: 42, fontWeight: 700 }}>
                      {s.manager.username}
                    </span>
                  </div>

                  {/* Logo (60%) stacked above metric+trend (40%) */}
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    {/* Logo — 60% */}
                    <div style={{ flex: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img
                        src={espnLogoUrl(s.teamCode)}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    {/* Metric value + caret side by side — 40% */}
                    <div style={{ flex: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                      <span style={{ color: '#e4e4e7', fontSize: 72, fontWeight: 900, lineHeight: 1 }}>
                        {formatValue(s.metricValue)}
                      </span>
                      {trendCaret != null ? (
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <span style={{ color: trendColor, fontSize: 36, fontWeight: 900, lineHeight: 1 }}>
                            {trendCaret}
                          </span>
                          <span style={{ color: trendColor, fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
                            {formatValue(Math.abs(delta!))}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#3f3f46', fontSize: 36, fontWeight: 700 }}>—</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
