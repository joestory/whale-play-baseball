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
  const [pendingTeam, setPendingTeam] = useState<string | null>(null)

  // Update clock every second for eligibility and countdown display
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Poll draft state every 3 seconds — keeps all clients in sync quickly
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
    const t = setInterval(refreshDraftState, 3_000)
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
    setPendingTeam(null)
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
        // Refresh immediately so a race-condition "just taken" team shows as taken in the UI
        await refreshDraftState()
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
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#0a0a0a]">
        <div className="text-center">
          <p className="text-4xl mb-3 opacity-20">⚾</p>
          <h2 className="font-semibold text-zinc-300">Draft is not open</h2>
          <p className="text-zinc-600 text-sm mt-1">
            Status: {contest.status}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-[max(6rem,calc(6rem+env(safe-area-inset-bottom)))]">
      <header className="bg-[#0a0a0a] border-b border-[#1f1f1f] px-4 py-4 sticky top-14 z-10">
        <div className="max-w-lg mx-auto">
          <h1 className="font-semibold text-white">{contest.name}</h1>
          <p className="text-zinc-500 text-xs mt-0.5">
            Metric: {contest.metricName}
          </p>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-5">
        {/* Status banner */}
        {myPick ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
            <p className="text-green-300 font-bold text-lg">Pick Submitted</p>
            <p className="text-green-500 text-sm mt-1">
              {getTeam(myPick.teamCode)?.name ?? myPick.teamCode}
            </p>
          </div>
        ) : !mySlot ? (
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-4 text-center">
            <p className="text-zinc-500">You are not in this contest&apos;s draft.</p>
          </div>
        ) : isEligible ? (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center animate-pulse">
            <p className="text-amber-300 font-bold text-lg">It&apos;s your turn!</p>
            <p className="text-amber-500 text-sm">Select a team below</p>
          </div>
        ) : (
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl p-4 text-center">
            <p className="text-zinc-300 font-semibold">
              Pick #{mySlot.pickOrder} in draft order
            </p>
            <p className="text-zinc-500 text-sm mt-1">
              Your window opens{' '}
              {new Date(mySlot.eligibleAt) > now
                ? `in ${formatCountdown(new Date(mySlot.eligibleAt), now)}`
                : 'now'}
            </p>
            {eligibleSlots.length > 0 && (
              <p className="text-zinc-600 text-xs mt-1">
                {eligibleSlots.map((s) => s.username).join(', ')} also eligible
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Draft order */}
        <section>
          <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Draft Order
          </h2>
          <div className="bg-[#111111] rounded-xl border border-[#1f1f1f] divide-y divide-[#1f1f1f]">
            {slots.map((slot) => {
              const pick = picks.find((p) => p.managerId === slot.managerId)
              const slotEligible = !slot.pickedAt && new Date(slot.eligibleAt) <= now
              const isMe = slot.managerId === managerId
              const msUntil = new Date(slot.eligibleAt).getTime() - now.getTime()

              return (
                <div
                  key={slot.managerId}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    isMe ? 'bg-green-500/5' : ''
                  }`}
                >
                  <span className="text-zinc-700 font-mono text-sm w-5 tabular-nums">
                    {slot.pickOrder}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm truncate ${isMe ? 'text-green-400' : 'text-zinc-200'}`}>
                      {slot.username} {isMe ? '(you)' : ''}
                    </p>
                    {pick && (
                      <p className="text-xs text-zinc-500">
                        {getTeam(pick.teamCode)?.name ?? pick.teamCode}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    {pick ? null : slotEligible ? (
                      <span className="text-amber-400 text-xs font-semibold animate-pulse">Now</span>
                    ) : msUntil > 0 ? (
                      <span className="text-zinc-400 text-xs tabular-nums font-mono bg-[#1a1a1a] px-2 py-0.5 rounded-md">
                        {formatCountdown(new Date(slot.eligibleAt), now)}
                      </span>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Team picker — only show when eligible and haven't picked */}
        {isEligible && !myPick && (
          <section>
            <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Select Your Team
            </h2>
            <div className="grid grid-cols-5 gap-2">
              {MLB_TEAMS.map((team) => {
                const taken = pickedTeams.has(team.code)
                const isPending = pendingTeam === team.code
                return (
                  <button
                    key={team.code}
                    onClick={() => !taken && setPendingTeam(team.code)}
                    disabled={taken || submitting}
                    className={`flex flex-col items-center justify-center rounded-xl p-3 gap-1.5 transition-all ${
                      taken
                        ? 'bg-[#0a0a0a] border border-red-500/40 cursor-not-allowed'
                        : isPending
                        ? 'bg-green-500/10 border border-green-500 scale-95'
                        : 'bg-[#111111] border border-[#1f1f1f] hover:border-green-500 hover:bg-green-500/5 active:scale-95'
                    }`}
                  >
                    <img
                      src={team.logo}
                      alt={team.name}
                      className={`w-8 h-8 object-contain ${taken ? 'grayscale opacity-50' : ''}`}
                    />
                    <span className={`text-[10px] font-bold ${taken ? 'text-red-900' : isPending ? 'text-green-400' : 'text-zinc-400'}`}>
                      {team.abbreviation}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* Show all teams with their status if not currently drafting */}
        {(!isEligible || myPick) && (
          <section>
            <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Teams
            </h2>
            <div className="grid grid-cols-5 gap-2">
              {MLB_TEAMS.map((team) => {
                const pick = picks.find((p) => p.teamCode === team.code)
                const isMyPick = pick?.managerId === managerId
                return (
                  <div
                    key={team.code}
                    className={`flex flex-col items-center justify-center rounded-xl p-3 gap-1.5 ${
                      isMyPick
                        ? 'bg-green-500/10 border border-green-500/30'
                        : pick
                        ? 'bg-[#0a0a0a] border border-red-500/40'
                        : 'bg-[#111111] border border-[#1f1f1f]'
                    }`}
                  >
                    <img
                      src={team.logo}
                      alt={team.name}
                      className={`w-8 h-8 object-contain ${pick && !isMyPick ? 'grayscale opacity-50' : ''}`}
                    />
                    <span className={`text-[10px] font-bold ${isMyPick ? 'text-green-400' : pick ? 'text-red-900' : 'text-zinc-400'}`}>
                      {team.abbreviation}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>

      {/* Pick confirmation overlay */}
      {pendingTeam && (() => {
        const team = getTeam(pendingTeam)
        const isRestricted = pendingTeam === 'PDX' && managerUsername !== 'Heff'

        if (isRestricted) {
          return (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center px-8"
              style={{ background: 'rgba(0,0,0,0.7)' }}
              onClick={() => setPendingTeam(null)}
            >
              <div
                className="bg-[#111111] border border-red-500/30 rounded-2xl p-6 w-56 flex flex-col items-center gap-4 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex w-full justify-end">
                  <button
                    onClick={() => setPendingTeam(null)}
                    className="text-zinc-600 hover:text-zinc-400 transition-colors text-lg leading-none"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
                <p className="text-2xl">🚫</p>
                <p className="text-[10px] font-semibold text-red-500 uppercase tracking-widest">Permission Denied</p>
                {team?.logo && (
                  <img src={team.logo} alt={team.name} className="w-14 h-14 object-contain grayscale opacity-40" />
                )}
                <p className="text-zinc-300 text-sm font-semibold text-center leading-snug">{team?.name ?? pendingTeam}</p>
                <p className="text-zinc-500 text-xs text-center">
                  Only Heff is allowed to draft this team.
                </p>
                <button
                  onClick={() => setPendingTeam(null)}
                  className="w-full py-2.5 rounded-xl bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] text-zinc-400 text-sm font-semibold transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )
        }

        return (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center px-8"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setPendingTeam(null)}
          >
            <div
              className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6 w-48 flex flex-col items-center gap-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Confirm pick</p>
              {team?.logo && (
                <img src={team.logo} alt={team.name} className="w-16 h-16 object-contain" />
              )}
              <p className="font-semibold text-white text-center leading-snug">{team?.name ?? pendingTeam}</p>
              <button
                onClick={() => handlePick(pendingTeam)}
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-black text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {submitting ? '…' : 'Confirm'}
              </button>
              <button
                onClick={() => setPendingTeam(null)}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )
      })()}
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
