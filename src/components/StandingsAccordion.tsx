'use client'

import { useState } from 'react'
import type { StandingRow } from '@/types'

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
  if (points.length < 2) return null

  const W = 56
  const H = 22
  const range = globalMax - globalMin
  const stroke = points[points.length - 1] >= points[0] ? '#4ade80' : '#52525b'

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

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatValue(v: number) {
  return v % 1 === 0 ? String(v) : v.toFixed(2)
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
  const today = new Date().toLocaleDateString('en-CA')
  const sparklineRange = computeSparklineRange(standings, contestDates)

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
              {/* Top pill: rank · icon · name */}
              <div className="inline-flex items-center gap-2 bg-[#1a1a1a] rounded-full px-3 py-1.5">
                <span className="text-xs font-bold text-zinc-500 tabular-nums">#{rankLabels.get(s.id)}</span>
                <span className="text-sm leading-none">{s.managerIcon}</span>
                <span className="text-sm font-medium text-zinc-100">{s.managerUsername}</span>
              </div>

              {/* Bottom: team logo · sparkline · metric */}
              <div className={`grid ${sparklineRange ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <div className="flex items-center justify-center py-2">
                  {s.teamLogo
                    ? <img src={s.teamLogo} alt={s.teamName} className="w-14 h-14 object-contain" />
                    : <span className="text-2xl text-zinc-600">{s.teamCode}</span>
                  }
                </div>
                {sparklineRange && (
                  <div className="flex items-center justify-center py-2">
                    <Sparkline
                      dailyValues={s.dailyValues}
                      dates={contestDates}
                      globalMin={sparklineRange.min}
                      globalMax={sparklineRange.max}
                    />
                  </div>
                )}
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
