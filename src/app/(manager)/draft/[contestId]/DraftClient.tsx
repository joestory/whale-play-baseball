'use client'

import { useState, useEffect, useCallback } from 'react'
import { MLB_TEAMS, getTeam } from '@/lib/constants'

type SlotInfo = {
  managerId: string
  username: string
  pickOrder: number
  eligibleAt: string
  pickedAt: string | null
}

type PickInfo = {
  managerId: string
  username: string
  teamCode: string
}

type ContestInfo = {
  id: string
  name: string
  metricName: string
  metricDescription: string | null
  status: string
  draftOpenAt: string
  draftCloseAt: string
  cascadeWindowMinutes: number
}

export default function DraftClient({
  contest,
  managerId,
  managerUsername,
  mySlot,
  myPick: initialMyPick,
  initialSlots,
  initialPicks,
}: {
  contest: ContestInfo
  managerId: string
  managerUsername: string
  mySlot: { pickOrder: number; eligibleAt: string; pickedAt: string | null } | null
  myPick: { teamCode: string } | null
  initialSlots: SlotInfo[]
  initialPicks: PickInfo[]
}) {
  const [slots, setSlots] = useState(initialSlots)
  const [picks, setPicks] = useState(initialPicks)
  const [myPick, setMyPick] = useState(initialMyPick)
  const [now, setNow] = useState(() => new Date())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Update clock every second for eligibility and countdown display
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Poll draft state every 30 seconds to pick up other managers' picks
  const refreshDraftState = useCallback(async () => {
    try {
      const res = await fetch(`/api/contests/${contest.id}/draft-state`)
      if (!res.ok) return
      const data = await res.json()
      setSlots(data.slots)
      setPicks(data.picks)
    } catch {
      // Silently ignore refresh failures
    }
  }, [contest.id])

  useEffect(() => {
    if (contest.status !== 'DRAFTING') return
    const t = setInterval(refreshDraftState, 30_000)
    return () => clearInterval(t)
  }, [contest.status, refreshDraftState])

  const pickedTeams = new Set(picks.map((p) => p.teamCode))
  const myCurrentSlot = mySlot
    ? slots.find((s) => s.managerId === managerId) ?? null
    : null

  const isEligible =
    myCurrentSlot &&
    !myCurrentSlot.pickedAt &&
    new Date(myCurrentSlot.eligibleAt) <= now

  async function handlePick(teamCode: string) {
    if (!isEligible || myPick || submitting) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch(`/api/draft/${contest.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamCode }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to submit pick')
      } else {
        setMyPick({ teamCode })
        await refreshDraftState()
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  const eligibleSlots = slots.filter(
    (s) => !s.pickedAt && new Date(s.eligibleAt) <= now
  )

  if (contest.status !== 'DRAFTING') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-2xl mb-2">⚾</p>
          <h2 className="font-bold text-slate-700">Draft is not open</h2>
          <p className="text-slate-500 text-sm mt-1">
            Status: {contest.status}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="bg-blue-900 text-white px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <h1 className="font-bold">{contest.name}</h1>
          <p className="text-blue-200 text-xs">
            Metric: {contest.metricName}
          </p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-5">
        {/* Status banner */}
        {myPick ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-green-800 font-bold text-lg">✓ Pick Submitted</p>
            <p className="text-green-600 text-sm mt-1">
              {getTeam(myPick.teamCode)?.name ?? myPick.teamCode}
            </p>
          </div>
        ) : !mySlot ? (
          <div className="bg-slate-100 rounded-xl p-4 text-center">
            <p className="text-slate-600">You are not in this contest&apos;s draft.</p>
          </div>
        ) : isEligible ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center animate-pulse">
            <p className="text-amber-800 font-bold text-lg">⚡ It&apos;s your turn!</p>
            <p className="text-amber-600 text-sm">Select a team below</p>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
            <p className="text-blue-800 font-semibold">
              Pick #{mySlot.pickOrder} in draft order
            </p>
            <p className="text-blue-600 text-sm mt-1">
              Your window opens{' '}
              {new Date(mySlot.eligibleAt) > now
                ? `in ${formatCountdown(new Date(mySlot.eligibleAt), now)}`
                : 'now'}
            </p>
            {eligibleSlots.length > 0 && (
              <p className="text-blue-400 text-xs mt-1">
                {eligibleSlots.map((s) => s.username).join(', ')} also eligible
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Draft order */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Draft Order
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {slots.map((slot) => {
              const pick = picks.find((p) => p.managerId === slot.managerId)
              const slotEligible = !slot.pickedAt && new Date(slot.eligibleAt) <= now
              const isMe = slot.managerId === managerId

              return (
                <div
                  key={slot.managerId}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    isMe ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className="text-slate-400 font-mono text-sm w-5">
                    {slot.pickOrder}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm truncate ${isMe ? 'text-blue-700' : 'text-slate-800'}`}>
                      {slot.username} {isMe ? '(you)' : ''}
                    </p>
                    {pick && (
                      <p className="text-xs text-slate-500">
                        {getTeam(pick.teamCode)?.name ?? pick.teamCode}
                      </p>
                    )}
                  </div>
                  <div>
                    {pick ? (
                      <span className="text-green-500 text-sm">✓</span>
                    ) : slotEligible ? (
                      <span className="text-amber-500 text-xs font-medium">Eligible</span>
                    ) : (
                      <span className="text-slate-300 text-xs">
                        {formatTimeUntil(new Date(slot.eligibleAt), now)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Team picker — only show when eligible and haven't picked */}
        {isEligible && !myPick && (
          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Select Your Team
            </h2>
            <div className="grid grid-cols-5 gap-2">
              {MLB_TEAMS.map((team) => {
                const taken = pickedTeams.has(team.code)
                return (
                  <button
                    key={team.code}
                    onClick={() => handlePick(team.code)}
                    disabled={taken || submitting}
                    className={`flex flex-col items-center justify-center rounded-xl p-2 min-h-[60px] text-center transition-all ${
                      taken
                        ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                        : 'bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 active:scale-95'
                    }`}
                  >
                    <span className="text-xs font-bold leading-tight">{team.abbreviation}</span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* Show all teams with their status if not currently drafting */}
        {(!isEligible || myPick) && (
          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Teams
            </h2>
            <div className="grid grid-cols-5 gap-2">
              {MLB_TEAMS.map((team) => {
                const pick = picks.find((p) => p.teamCode === team.code)
                const isMyPick = pick?.managerId === managerId
                return (
                  <div
                    key={team.code}
                    className={`flex flex-col items-center justify-center rounded-xl p-2 min-h-[60px] text-center ${
                      isMyPick
                        ? 'bg-green-100 border border-green-300'
                        : pick
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-white border border-slate-200'
                    }`}
                  >
                    <span className={`text-xs font-bold ${pick && !isMyPick ? 'line-through' : ''}`}>
                      {team.abbreviation}
                    </span>
                    {isMyPick && <span className="text-green-600 text-xs">✓</span>}
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function formatCountdown(target: Date, now: Date): string {
  const ms = target.getTime() - now.getTime()
  if (ms <= 0) return 'now'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatTimeUntil(target: Date, now: Date): string {
  const ms = target.getTime() - now.getTime()
  if (ms <= 0) return ''
  return formatCountdown(target, now)
}
