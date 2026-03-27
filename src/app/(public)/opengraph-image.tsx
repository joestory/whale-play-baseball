import { ImageResponse } from 'next/og'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

function formatValue(v: number) {
  return v % 1 === 0 ? String(v) : v.toFixed(2)
}

export default async function Image() {
  const contest = await prisma.contest.findFirst({
    where: { status: { in: ['ACTIVE', 'DRAFTING'] } },
    orderBy: [{ season: 'desc' }, { weekNumber: 'desc' }],
    include: {
      standings: {
        orderBy: { rank: 'asc' },
        take: 3,
        include: {
          manager: { select: { username: true } },
        },
      },
      picks: { select: { managerId: true } },
    },
  })

  const title = contest ? `${contest.name} — Week ${contest.weekNumber}` : 'Whale Play Baseball'
  const metricName = contest?.metricName ?? 'Fantasy Baseball Weekly Draft League'

  const pickedIds = new Set(contest?.picks.map((p) => p.managerId) ?? [])
  const top3 = (contest?.standings ?? []).filter((s) => pickedIds.has(s.managerId)).slice(0, 3)

  const rankLabel = (rank: number | null, i: number) => rank != null ? String(rank) : String(i + 1)

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: '#0a0a0a',
          display: 'flex',
          flexDirection: 'column',
          padding: '64px 72px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4ade80' }} />
          <span style={{ color: '#4ade80', fontSize: 18, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase' }}>
            {contest?.status === 'ACTIVE' ? 'Live Standings' : contest?.status === 'DRAFTING' ? 'Draft Open' : 'Whale Play Baseball'}
          </span>
        </div>

        {/* Contest title */}
        <div style={{ color: '#ffffff', fontSize: 52, fontWeight: 700, lineHeight: 1.1, marginBottom: 8 }}>
          {title}
        </div>
        <div style={{ color: '#71717a', fontSize: 26, marginBottom: 48 }}>
          {metricName}
        </div>

        {/* Standings rows */}
        {top3.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {top3.map((s, i) => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 24,
                  background: '#111111',
                  border: '1px solid #1f1f1f',
                  borderRadius: 16,
                  padding: '20px 28px',
                }}
              >
                <span
                  style={{
                    color: i === 0 ? '#4ade80' : '#52525b',
                    fontSize: 28,
                    fontWeight: 800,
                    width: 36,
                    textAlign: 'center',
                  }}
                >
                  {rankLabel(s.rank, i)}
                </span>
                <span style={{ color: '#e4e4e7', fontSize: 26, fontWeight: 600, flex: 1 }}>
                  {s.manager.username}
                </span>
                <span
                  style={{
                    color: '#71717a',
                    fontSize: 22,
                    fontWeight: 600,
                    letterSpacing: 1,
                    background: '#1a1a1a',
                    padding: '6px 16px',
                    borderRadius: 8,
                    border: '1px solid #262626',
                  }}
                >
                  {s.teamCode}
                </span>
                <span style={{ color: '#4ade80', fontSize: 32, fontWeight: 800, minWidth: 80, textAlign: 'right' }}>
                  {formatValue(s.metricValue)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: 'auto',
            color: '#3f3f46',
            fontSize: 18,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          Whale Play Baseball
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
