'use client'

import { useState, useEffect, useCallback } from 'react'
import { getTeam } from '@/lib/constants'
import type { StandingRow } from '@/types'

type ApiStanding = {
  id: string
  teamCode: string
  metricValue: number
  rank: number | null
  previousRank: number | null
  dailyValues: Record<string, number>
  relatedValues: Record<string, number>
  manager: { id: string; username: string; icon: string | null }
}

function apiToRow(s: ApiStanding, dateSet: Set<string>): StandingRow {
  const team = getTeam(s.teamCode)
  const raw = (s.dailyValues ?? {}) as Record<string, number>
  return {
    id: s.id,
    rank: s.rank,
    previousRank: s.previousRank,
    managerIcon: s.manager.icon ?? '⚾',
    managerUsername: s.manager.username,
    teamCode: s.teamCode,
    teamName: team?.name ?? s.teamCode,
    teamLogo: team?.logo ?? '',
    metricValue: s.metricValue,
    dailyValues: Object.fromEntries(Object.entries(raw).filter(([d]) => dateSet.has(d))),
    relatedValues: (s.relatedValues ?? {}) as Record<string, number>,
  }
}

// ─── Trend ────────────────────────────────────────────────────────────────────

// Rank delta vs. the prior standings update.  Positive = moved up, negative = moved down.
// Uses previousRank stored server-side during pollContest — no client-side re-ranking needed.
function computeTrend(standings: StandingRow[]): Map<string, number | null> {
  return new Map(
    standings.map((s) => {
      if (s.previousRank == null || s.rank == null) return [s.id, null]
      return [s.id, s.previousRank - s.rank]
    })
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

function computeDaysRemaining(endDateStr: string): number {
  const todayEastern = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  return Math.round((new Date(endDateStr).getTime() - new Date(todayEastern).getTime()) / 86400000) + 1
}

function daysRemainingColor(days: number): string {
  if (days === 1) return 'text-red-400'
  if (days === 2) return 'text-orange-400'
  if (days === 3) return 'text-yellow-400'
  return 'text-zinc-500'
}

export default function StandingsClient({
  contestId,
  contestStatus,
  metricName,
  initialLastPolledAt,
  initialStandings,
  contestDates,
  contestEndDate,
  pdxFirst = false,
}: {
  contestId: string
  contestStatus: string
  metricName: string
  initialLastPolledAt: string | null
  initialStandings: StandingRow[]
  contestDates: string[]
  contestEndDate: string
  pdxFirst?: boolean
}) {
  const [standings, setStandings] = useState(initialStandings)
  const [lastPolledAt, setLastPolledAt] = useState(initialLastPolledAt)
  const [copied, setCopied] = useState(false)

  const poll = useCallback(async () => {
    if (contestStatus !== 'ACTIVE') return
    try {
      const res = await fetch(`/api/contests/${contestId}/standings`)
      if (!res.ok) return
      const data: { standings: ApiStanding[]; lastPolledAt: string | null } = await res.json()
      const dSet = new Set(contestDates)
      setStandings(data.standings.map((s) => apiToRow(s, dSet)))
      if (data.lastPolledAt) setLastPolledAt(data.lastPolledAt)
    } catch {
      // silent — stale data is fine for a nightly-refreshing page
    }
  }, [contestId, contestStatus, contestDates])

  useEffect(() => {
    if (contestStatus !== 'ACTIVE') return
    // poll is async — setState calls happen asynchronously inside fetch callback
    // eslint-disable-next-line react-hooks/set-state-in-effect
    poll()
    const interval = setInterval(poll, 60 * 60 * 1000) // hourly
    return () => clearInterval(interval)
  }, [poll, contestStatus])

  const trendMap = computeTrend(standings)

  // Build rank labels with T-prefix for ties (e.g. "T2" when multiple share rank 2)
  const rankFreq = new Map<number, number>()
  for (const s of standings) {
    if (s.rank != null) rankFreq.set(s.rank, (rankFreq.get(s.rank) ?? 0) + 1)
  }
  function rankLabel(s: StandingRow) {
    if (s.rank == null) return '—'
    return rankFreq.get(s.rank)! > 1 ? `T${s.rank}` : String(s.rank)
  }

  const handleShare = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable (non-HTTPS or WebView) — fall back to prompt
      window.prompt('Copy this link:', url)
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
          Standings
        </h2>
        <div className="flex items-center gap-3">
          {lastPolledAt && (
            <span className="text-[10px] text-zinc-600">
              Updated {new Date(lastPolledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          <button
            onClick={handleShare}
            className="text-[10px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors px-2 py-1 rounded border border-zinc-700 hover:border-zinc-500"
          >
            {copied ? 'Copied!' : 'Share'}
          </button>
        </div>
      </div>
      {(() => {
        const days = computeDaysRemaining(contestEndDate)
        return days > 0 ? (
          <p className={`text-[10px] font-medium mb-3 ${daysRemainingColor(days)}`}>
            {days} {days === 1 ? 'day' : 'days'} remaining
          </p>
        ) : null
      })()}

      {standings.length > 0 ? (
        <div className="space-y-2">
          {(pdxFirst
            ? [...standings.filter((s) => s.teamCode === 'PDX'), ...standings.filter((s) => s.teamCode !== 'PDX')]
            : standings
          ).map((s) => {
            if (pdxFirst && s.teamCode === 'PDX') {
              return (
                <div
                  key={s.id}
                  className="relative overflow-hidden rounded-xl border-2 border-emerald-500/60 px-4 py-5"
                  style={{ background: 'linear-gradient(135deg, #0a1f14 0%, #111111 50%, #0d1a10 100%)' }}
                >
                  {/* Animated glow ring */}
                  <div className="absolute inset-0 rounded-xl animate-pulse"
                    style={{ boxShadow: 'inset 0 0 30px rgba(52,211,153,0.07)' }} />
                  {/* Corner shimmer accents */}
                  <div className="absolute top-0 left-0 w-16 h-16 rounded-br-full opacity-20"
                    style={{ background: 'radial-gradient(circle at top left, #34d399, transparent)' }} />
                  <div className="absolute bottom-0 right-0 w-20 h-20 rounded-tl-full opacity-15"
                    style={{ background: 'radial-gradient(circle at bottom right, #34d399, transparent)' }} />

                  <div className="relative flex items-center gap-3">
                    {/* Trophy + rank */}
                    <div className="flex-shrink-0 text-center w-10">
                      <div className="text-3xl leading-none mb-1">🏆</div>
                      <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">1st</div>
                    </div>

                    {/* Team logo — larger */}
                    {s.teamLogo && (
                      <img
                        src={s.teamLogo}
                        alt={s.teamName}
                        className="w-12 h-12 object-contain shrink-0 drop-shadow-lg"
                        style={{ filter: 'drop-shadow(0 0 8px rgba(52,211,153,0.4))' }}
                      />
                    )}

                    {/* Manager info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-0.5">
                        First Place
                      </p>
                      <p className="font-bold text-white truncate text-base leading-tight">
                        <span className="mr-1">{s.managerIcon}</span>
                        {s.managerUsername}
                      </p>
                      <p className="text-xs text-emerald-700 font-medium">{s.teamName}</p>
                    </div>

                    {/* Metric value */}
                    <div className="text-right shrink-0">
                      <p className="text-4xl font-black tabular-nums leading-none"
                        style={{ color: '#34d399', textShadow: '0 0 20px rgba(52,211,153,0.5)' }}>
                        1
                      </p>
                      <p className="text-[10px] text-emerald-700 font-medium mt-1">{metricName}</p>
                    </div>
                  </div>
                </div>
              )
            }

            const trend = trendMap.get(s.id) ?? null
            return (
              <div
                key={s.id}
                className="bg-[#111111] rounded-xl border border-[#1f1f1f] px-4 py-3 flex items-center gap-3"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {s.teamLogo && (
                    <img
                      src={s.teamLogo}
                      alt={s.teamName}
                      className="w-7 h-7 object-contain shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-100 truncate">
                      <span className="mr-1">{s.managerIcon}</span>
                      {s.managerUsername}
                    </p>
                    <p className="text-xs text-zinc-500">{s.teamName}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center justify-end gap-1 mb-0.5">
                    <span className="text-xs font-semibold text-zinc-400">{rankLabel(s)}</span>
                    {trend != null && trend !== 0 && (
                      <span className={`text-[10px] font-medium ${trend > 0 ? 'text-green-400' : 'text-rose-400'}`}>
                        {trend > 0 ? `↑${trend}` : `↓${Math.abs(trend)}`}
                      </span>
                    )}
                    {trend === 0 && (
                      <span className="text-[10px] text-zinc-600">—</span>
                    )}
                  </div>
                  <p className="text-xl font-bold text-green-400 tabular-nums">
                    {s.metricValue.toFixed(s.metricValue % 1 === 0 ? 0 : 2)}
                  </p>
                  <p className="text-xs text-zinc-600">{metricName}</p>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-[#111111] rounded-xl border border-[#1f1f1f] p-6 text-center text-zinc-600">
          No standings yet
        </div>
      )}
    </section>
  )
}
