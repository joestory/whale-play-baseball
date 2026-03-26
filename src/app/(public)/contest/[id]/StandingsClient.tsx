'use client'

import { useState, useEffect, useCallback } from 'react'
import { getTeam } from '@/lib/constants'
import type { StandingRow } from '@/types'

type ApiStanding = {
  id: string
  teamCode: string
  metricValue: number
  rank: number | null
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

// ─── Sparkline ────────────────────────────────────────────────────────────────

function computeSparklineRange(
  standings: StandingRow[],
  dates: string[]
): { min: number; max: number } | null {
  let globalMin = Infinity
  let globalMax = -Infinity
  for (const s of standings) {
    for (const d of dates) {
      const v = s.dailyValues[d]
      if (v != null) {
        if (v < globalMin) globalMin = v
        if (v > globalMax) globalMax = v
      }
    }
  }
  if (!isFinite(globalMin) || globalMax === globalMin) return null
  return { min: globalMin, max: globalMax }
}

function Sparkline({
  dailyValues,
  dates,
  globalMin,
  globalMax,
}: {
  dailyValues: Record<string, number>
  dates: string[]
  globalMin: number
  globalMax: number
}) {
  const points = dates
    .map((d) => dailyValues[d])
    .filter((v): v is number => v != null)
  if (points.length < 2) return <span className="text-zinc-600 tabular-nums">—</span>

  const W = 60
  const H = 24
  const range = globalMax - globalMin
  const isGreen = points[points.length - 1] > points[0]
  const stroke = isGreen ? '#4ade80' : '#52525b' // green-400 : zinc-600

  const coords = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * (W - 2) + 1
      const y = H - 1 - ((v - globalMin) / range) * (H - 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="overflow-visible shrink-0"
      aria-hidden="true"
    >
      <polyline
        points={coords}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function StandingsClient({
  contestId,
  contestStatus,
  metricName,
  initialLastPolledAt,
  initialStandings,
  contestDates,
}: {
  contestId: string
  contestStatus: string
  metricName: string
  initialLastPolledAt: string | null
  initialStandings: StandingRow[]
  contestDates: string[]
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

  const sparklineRange = computeSparklineRange(standings, contestDates)

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
      <div className="flex items-center justify-between mb-3">
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

      {standings.length > 0 ? (
        <div className="space-y-2">
          {standings.map((s) => (
            <div
              key={s.id}
              className="bg-[#111111] rounded-xl border border-[#1f1f1f] px-4 py-3 flex items-center gap-3"
            >
              <span className="text-xl font-bold text-zinc-700 w-8 text-center tabular-nums">
                {rankLabel(s)}
              </span>

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

              {sparklineRange ? (
                <Sparkline
                  dailyValues={s.dailyValues}
                  dates={contestDates}
                  globalMin={sparklineRange.min}
                  globalMax={sparklineRange.max}
                />
              ) : null}

              <div className="text-right shrink-0">
                <p className="text-xl font-bold text-green-400 tabular-nums">
                  {s.metricValue.toFixed(s.metricValue % 1 === 0 ? 0 : 2)}
                </p>
                <p className="text-xs text-zinc-600">{metricName}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#111111] rounded-xl border border-[#1f1f1f] p-6 text-center text-zinc-600">
          No standings yet
        </div>
      )}
    </section>
  )
}
