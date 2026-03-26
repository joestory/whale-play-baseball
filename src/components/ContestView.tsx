'use client'

import { useState } from 'react'
import type { StandingRow } from '@/types'
import StandingsAccordion from './StandingsAccordion'

type Props = {
  status: string
  standingRows: StandingRow[]
  contestDates: string[]
  metricName: string
  sweepstakesDescription: string | null
  sweepstakesPhoto: string | null
}

export default function ContestView({
  status,
  standingRows,
  contestDates,
  metricName,
  sweepstakesDescription,
  sweepstakesPhoto,
}: Props) {
  const hasStandings = standingRows.length > 0
  const hasSweepstakes = !!(sweepstakesDescription || sweepstakesPhoto)

  // Show sweepstakes by default when no standings or when upcoming/drafting
  const defaultView = hasStandings ? 'standings' : 'sweepstakes'
  const [view, setView] = useState<'standings' | 'sweepstakes'>(defaultView)

  const showToggle = hasStandings && hasSweepstakes

  return (
    <div className="space-y-3">
      {showToggle && (
        <div className="flex rounded-lg border border-[#1f1f1f] bg-[#0a0a0a] overflow-hidden">
          <button
            type="button"
            onClick={() => setView('standings')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              view === 'standings'
                ? 'bg-green-500 text-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Standings
          </button>
          <button
            type="button"
            onClick={() => setView('sweepstakes')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              view === 'sweepstakes'
                ? 'bg-green-500 text-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sweepstakes
          </button>
        </div>
      )}

      {view === 'standings' && hasStandings && (
        <StandingsAccordion
          standings={standingRows}
          contestDates={contestDates}
          metricName={metricName}
        />
      )}

      {(view === 'sweepstakes' || !hasStandings) && hasSweepstakes && (
        <div className="bg-[#111111] rounded-xl border border-[#1f1f1f] overflow-hidden">
<<<<<<< HEAD
=======
          {sweepstakesDescription && (
            <p className="px-4 py-3 text-sm text-zinc-300">{sweepstakesDescription}</p>
          )}
>>>>>>> origin/claude/implement-todo-item-eauS6
          {sweepstakesPhoto && (
            <img
              src={sweepstakesPhoto}
              alt="Sweepstakes"
              className="w-full object-cover"
            />
          )}
<<<<<<< HEAD
          {sweepstakesDescription && (
            <p className="px-4 py-3 text-sm text-zinc-300">{sweepstakesDescription}</p>
          )}
=======
>>>>>>> origin/claude/implement-todo-item-eauS6
        </div>
      )}

      {view === 'standings' && !hasStandings && (
        <div className="bg-[#111111] rounded-xl border border-[#1f1f1f] p-8 text-center">
          <p className="text-zinc-500">Standings appear after picks are made.</p>
        </div>
      )}

      {!hasSweepstakes && !hasStandings && (
        <div className="bg-[#111111] rounded-xl border border-[#1f1f1f] p-8 text-center">
          <p className="text-zinc-500">Standings appear after picks are made.</p>
        </div>
      )}
    </div>
  )
}
