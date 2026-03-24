'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getTeam } from '@/lib/constants'

type ContestInfo = {
  id: string
  name: string
  weekNumber: number
  season: number
  metricName: string
  status: string
  savantCsvUrl: string
  lastPolledAt: string | null
  draftOpenAt: string
  draftCloseAt: string
  cascadeWindowMinutes: number
}

type SlotInfo = {
  managerId: string
  username: string
  pickOrder: number
  pickedAt: string | null
}

type PickInfo = {
  managerId: string
  username: string
  teamCode: string
}

type StandingInfo = {
  managerId: string
  username: string
  teamCode: string
  metricValue: number
  rank: number | null
}

type ManagerInfo = {
  id: string
  username: string
}

export default function ContestAdminClient({
  contest,
  draftSlots,
  picks,
  standings,
  allManagers,
}: {
  contest: ContestInfo
  draftSlots: SlotInfo[]
  picks: PickInfo[]
  standings: StandingInfo[]
  allManagers: ManagerInfo[]
}) {
  const router = useRouter()
  const [polling, setPolling] = useState(false)
  const [pollMessage, setPollMessage] = useState('')
  const [savingOrder, setSavingOrder] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Draft order editor: start from existing slots or all non-admin managers
  const [orderedIds, setOrderedIds] = useState<string[]>(
    draftSlots.length > 0
      ? draftSlots.map((s) => s.managerId)
      : allManagers.map((m) => m.id)
  )

  function moveUp(index: number) {
    if (index === 0) return
    const next = [...orderedIds]
    ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
    setOrderedIds(next)
  }

  function moveDown(index: number) {
    if (index === orderedIds.length - 1) return
    const next = [...orderedIds]
    ;[next[index + 1], next[index]] = [next[index], next[index + 1]]
    setOrderedIds(next)
  }

  async function handleRandomize() {
    setSavingOrder(true)
    try {
      const res = await fetch(`/api/admin/draft-order/${contest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ randomize: true }),
      })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setSavingOrder(false)
    }
  }

  async function handleSaveOrder() {
    setSavingOrder(true)
    try {
      const res = await fetch(`/api/admin/draft-order/${contest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedManagerIds: orderedIds }),
      })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setSavingOrder(false)
    }
  }

  async function handlePoll() {
    setPolling(true)
    setPollMessage('')
    try {
      const res = await fetch(`/api/admin/poll/${contest.id}`, { method: 'POST' })
      if (res.ok) {
        setPollMessage('Poll successful!')
        router.refresh()
      } else {
        const d = await res.json()
        setPollMessage(d.error ?? 'Poll failed')
      }
    } catch {
      setPollMessage('Network error')
    } finally {
      setPolling(false)
    }
  }

  async function handleStatusChange(status: string) {
    setUpdatingStatus(true)
    try {
      await fetch(`/api/admin/contests/${contest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      router.refresh()
    } finally {
      setUpdatingStatus(false)
    }
  }

  const idToUsername = Object.fromEntries(allManagers.map((m) => [m.id, m.username]))

  const statusOptions = ['UPCOMING', 'DRAFTING', 'ACTIVE', 'COMPLETED']

  return (
    <div className="space-y-6">
      <div>
        <a href="/admin" className="text-sm text-slate-500 hover:text-slate-700">← Admin</a>
        <h1 className="text-xl font-bold mt-1">{contest.name}</h1>
        <p className="text-sm text-slate-500">
          Week {contest.weekNumber} · {contest.season} · {contest.metricName}
        </p>
      </div>

      {/* Status control */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="font-semibold">Status</h2>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              disabled={updatingStatus || contest.status === s}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                contest.status === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Poll */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="font-semibold">Standings Poll</h2>
        <p className="text-xs text-slate-500 break-all">{contest.savantCsvUrl}</p>
        {contest.lastPolledAt && (
          <p className="text-xs text-slate-400">
            Last polled: {new Date(contest.lastPolledAt).toLocaleString()}
          </p>
        )}
        <button
          onClick={handlePoll}
          disabled={polling}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
        >
          {polling ? 'Polling…' : 'Poll Baseball Savant Now'}
        </button>
        {pollMessage && (
          <p className="text-sm text-slate-600">{pollMessage}</p>
        )}
      </div>

      {/* Draft order */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <h2 className="font-semibold">Draft Order</h2>
        <div className="space-y-1">
          {orderedIds.map((id, i) => {
            const pick = picks.find((p) => p.managerId === id)
            return (
              <div key={id} className="flex items-center gap-2 py-1">
                <span className="text-slate-400 text-sm w-5">{i + 1}</span>
                <span className="flex-1 text-sm font-medium">{idToUsername[id] ?? id}</span>
                {pick && (
                  <span className="text-xs text-green-600">
                    {getTeam(pick.teamCode)?.abbreviation ?? pick.teamCode} ✓
                  </span>
                )}
                <button
                  onClick={() => moveUp(i)}
                  disabled={i === 0}
                  className="text-slate-400 hover:text-slate-700 disabled:opacity-30 px-1"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveDown(i)}
                  disabled={i === orderedIds.length - 1}
                  className="text-slate-400 hover:text-slate-700 disabled:opacity-30 px-1"
                >
                  ↓
                </button>
              </div>
            )
          })}
        </div>
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleRandomize}
            disabled={savingOrder}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors"
          >
            Randomize
          </button>
          <button
            onClick={handleSaveOrder}
            disabled={savingOrder}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition-colors"
          >
            {savingOrder ? 'Saving…' : 'Save Order'}
          </button>
        </div>
      </div>

      {/* Standings */}
      {standings.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <h2 className="font-semibold">Current Standings</h2>
          <div className="space-y-1">
            {standings.map((s) => (
              <div key={s.managerId} className="flex items-center gap-3 text-sm">
                <span className="text-slate-400 w-5">{s.rank ?? '—'}</span>
                <span className="flex-1 font-medium">{s.username}</span>
                <span className="text-slate-500">{getTeam(s.teamCode)?.abbreviation ?? s.teamCode}</span>
                <span className="font-bold text-blue-600">
                  {s.metricValue.toFixed(s.metricValue % 1 === 0 ? 0 : 2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
