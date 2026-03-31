'use client'

import { useState } from 'react'
import type { StandingRow } from '@/types'
import { getTeam } from '@/lib/constants'


function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatValue(v: number) {
  return v % 1 === 0 ? String(v) : v.toFixed(2)
}

function computeTrend(
  standings: StandingRow[],
  contestDates: string[]
): Map<string, number | null> {
  if (contestDates.length < 2) return new Map(standings.map((s) => [s.id, null]))

  const prevDate = contestDates[contestDates.length - 2]
  const withPrev = standings
    .map((s) => ({ id: s.id, prevVal: s.dailyValues[prevDate] ?? 0 }))
    .sort((a, b) => b.prevVal - a.prevVal)

  const prevRankMap = new Map<string, number>()
  withPrev.forEach((x, i) => {
    const prevRank =
      i === 0 ? 1
      : withPrev[i].prevVal === withPrev[i - 1].prevVal
      ? prevRankMap.get(withPrev[i - 1].id)!
      : i + 1
    prevRankMap.set(x.id, prevRank)
  })

  return new Map(
    standings.map((s) => {
      const prevRank = prevRankMap.get(s.id)
      if (prevRank == null || s.rank == null) return [s.id, null]
      return [s.id, prevRank - s.rank]
    })
  )
}

function buildRankLabels(standings: StandingRow[]): Map<string, string> {
  const freq = new Map<number, number>()
  for (const s of standings) {
    if (s.rank != null) freq.set(s.rank, (freq.get(s.rank) ?? 0) + 1)
  }
  const labels = new Map<string, string>()
  for (const s of standings) {
    if (s.rank == null) {
      labels.set(s.id, '—')
    } else {
      labels.set(s.id, (freq.get(s.rank)! > 1 ? `T${s.rank}` : String(s.rank)))
    }
  }
  return labels
}

export default function StandingsAccordion({
  standings,
  contestDates,
  metricName,
}: {
  standings: StandingRow[]
  contestDates: string[]
  metricName: string
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const rankLabels = buildRankLabels(standings)
  const trendMap = computeTrend(standings, contestDates)
  const today = new Date().toLocaleDateString('en-CA')

  if (standings.length === 0) {
    return (
      <div className="bg-[#111111] rounded-xl border border-[#1f1f1f] p-8 text-center">
        <p className="text-zinc-500">Standings appear after picks are made.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {standings.map((s) => {
        const isOpen = openId === s.id
        return (
          <div
            key={s.id}
            className={`bg-[#111111] rounded-xl border transition-colors ${isOpen ? 'border-green-500/20' : 'border-[#1f1f1f]'}`}
          >
            {/* Collapsed row */}
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : s.id)}
              className="w-full p-4 text-left space-y-3"
            >
              {/* Top pill: rank · trend · icon · name */}
              <div className="inline-flex items-center gap-2 bg-[#1a1a1a] rounded-full px-3 py-1.5">
                <span className="text-xs font-bold text-zinc-500 tabular-nums">{rankLabels.get(s.id)}</span>
                {(() => {
                  const trend = trendMap.get(s.id) ?? null
                  if (trend == null) return null
                  if (trend === 0) return <span className="text-[10px] text-zinc-600">—</span>
                  return (
                    <span className={`text-[10px] font-medium ${trend > 0 ? 'text-green-400' : 'text-rose-400'}`}>
                      {trend > 0 ? `↑${trend}` : `↓${Math.abs(trend)}`}
                    </span>
                  )
                })()}
                <span className="text-sm leading-none">{s.managerIcon}</span>
                <span className="text-sm font-medium text-zinc-100">{s.managerUsername}</span>
              </div>

              {/* Bottom: team logo · metric */}
              <div className="grid grid-cols-2">
                <div className="flex items-center justify-center py-2">
                  {s.teamLogo
                    ? <img src={s.teamLogo} alt={s.teamName} className="w-14 h-14 object-contain" />
                    : <span className="text-2xl text-zinc-600">{s.teamCode}</span>
                  }
                </div>
                <div className="flex items-center justify-center py-2">
                  <span className="text-4xl font-bold text-green-400 tabular-nums">
                    {formatValue(s.metricValue)}
                  </span>
                </div>
              </div>
            </button>

            {/* Expanded panel */}
            {isOpen && (
              <div className="border-t border-[#1f1f1f] px-4 pt-2 pb-3 space-y-3">
                {/* Per-date breakdown */}
                <div className="space-y-1">
                  {contestDates.length === 0 ? (
                    <p className="text-xs text-zinc-600 py-1">No data yet for this contest period.</p>
                  ) : (
                    contestDates.map((d, i) => {
                      const cumulative = s.dailyValues[d]
                      const prevDate = i > 0 ? contestDates[i - 1] : null
                      const prevCumulative = prevDate != null ? s.dailyValues[prevDate] : undefined
                      const delta = cumulative != null
                        ? (prevCumulative != null ? cumulative - prevCumulative : cumulative)
                        : null

                      return (
                        <div key={d} className="flex items-center gap-2 py-0.5">
                          <span className={`text-xs w-14 flex-shrink-0 ${d === today ? 'text-yellow-400 font-semibold' : 'text-zinc-500'}`}>{formatDate(d)}</span>
                          {(() => {
                            const opp = s.dailyOpponents?.[d] ? getTeam(s.dailyOpponents[d]) : null
                            return opp?.logo
                              ? <img src={opp.logo} alt={opp.abbreviation} className="w-4 h-4 object-contain flex-shrink-0 opacity-70" />
                              : <span className="w-4 h-4 flex-shrink-0" />
                          })()}
                          <span className="flex-1" />
                          <span className="text-xs tabular-nums text-zinc-300 w-10 text-right">
                            {cumulative != null ? formatValue(cumulative) : '—'}
                          </span>
                          <span className={`text-xs tabular-nums w-10 text-right flex-shrink-0 ${
                            delta == null || delta === 0
                              ? 'text-zinc-600'
                              : delta > 0
                              ? 'text-green-400'
                              : 'text-red-400'
                          }`}>
                            {delta == null
                              ? '—'
                              : delta === 0
                              ? '—'
                              : delta > 0
                              ? `+${formatValue(delta)}`
                              : formatValue(delta)}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Related metrics */}
                {Object.keys(s.relatedValues).length > 0 && (
                  <div
                    className="border-t border-[#1f1f1f] pt-3"
                    style={{ display: 'grid', gridTemplateColumns: `repeat(${Object.keys(s.relatedValues).length}, 1fr)` }}
                  >
                    {Object.entries(s.relatedValues).map(([name, value]) => (
                      <div key={name} className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">{name}</span>
                        <span className="text-lg font-bold tabular-nums" style={{ color: '#facc15' }}>{formatValue(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
