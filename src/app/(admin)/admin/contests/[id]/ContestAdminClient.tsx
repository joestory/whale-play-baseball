'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getTeam, MLB_TEAMS } from '@/lib/constants'
import type { MetricConfig } from '@/types'
import MetricBuilderSection from '@/components/MetricBuilderSection'

type ContestInfo = {
  id: string
  name: string
  weekNumber: number
  season: number
  metricName: string
  metricDescription: string
  commissionerMessage: string
  sweepstakesPhoto: string | null
  status: string
  savantCsvUrl: string
  metricConfig: string
  lastPolledAt: string | null
  startDate: string
  endDate: string
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
  isAdmin: boolean
}

const inputClass =
  'w-full rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-green-500 focus:outline-none transition-colors'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Parse a UTC datetime string ("YYYY-MM-DDTHH:mm", no Z) into local date/time parts.
function utcStringToLocalParts(utcStr: string): { date: string; time: string } {
  const d = new Date(utcStr + 'Z')
  return {
    date: d.toLocaleDateString('en-CA'),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
  }
}

function MonthDayInput({ value, onChange, required }: { value: string; onChange: (v: string) => void; required?: boolean }) {
  const month = value.slice(5, 7)
  const day = value.slice(8, 10)
  const daysInMonth = month ? new Date(2026, parseInt(month), 0).getDate() : 31
  const selectClass = inputClass + ' appearance-none'
  return (
    <div className="grid grid-cols-2 gap-2">
      <select value={month} onChange={(e) => onChange(`2026-${e.target.value}-${day || '01'}`)} className={selectClass} required={required}>
        <option value="">Month</option>
        {MONTHS.map((m, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
      </select>
      <select value={day} onChange={(e) => onChange(`2026-${month || '01'}-${e.target.value}`)} className={selectClass} required={required}>
        <option value="">Day</option>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
          <option key={d} value={String(d).padStart(2, '0')}>{d}</option>
        ))}
      </select>
    </div>
  )
}

const card = 'bg-[#111111] rounded-xl border border-[#1f1f1f]'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-zinc-600 mt-1">{hint}</p>}
    </div>
  )
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
  useEffect(() => { window.scrollTo(0, 0) }, [])
  const [polling, setPolling] = useState(false)
  const [pollMessage, setPollMessage] = useState('')
  const [savingOrder, setSavingOrder] = useState(false)
  const [settingDraftOrder, setSettingDraftOrder] = useState(false)
  const [draftOrderMessage, setDraftOrderMessage] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [availableColumns, setAvailableColumns] = useState<string[]>([])
  const [fetchingColumns, setFetchingColumns] = useState(false)
  const [columnFetchStatus, setColumnFetchStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [columnFetchMessage, setColumnFetchMessage] = useState('')
  const [sweepstakesPhoto, setSweepstakesPhoto] = useState<string | null>(contest.sweepstakesPhoto)
  const [photoFileName, setPhotoFileName] = useState<string | null>(null)

  const nonAdminManagers = allManagers.filter((m) => !m.isAdmin)

  // Edit form state — draft time converted from stored UTC string to user's local time
  const localDraft = utcStringToLocalParts(contest.draftOpenAt)
  const [form, setForm] = useState({
    name: contest.name,
    weekNumber: String(contest.weekNumber),
    season: String(contest.season),
    metricName: contest.metricName,
    metricDescription: contest.metricDescription,
    commissionerMessage: contest.commissionerMessage,
    savantCsvUrl: contest.savantCsvUrl,
    startDate: contest.startDate,
    endDate: contest.endDate,
    draftOpenAt: localDraft.date,
    draftTime: localDraft.time,
    cascadeWindowMinutes: String(contest.cascadeWindowMinutes),
  })

  // Parse existing metricConfig JSON for the guided builder
  const initialMetricConfig: MetricConfig | null = (() => {
    try { return JSON.parse(contest.metricConfig) } catch { return null }
  })()
  const [metricConfig, setMetricConfig] = useState<MetricConfig | null>(initialMetricConfig)

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setEditSuccess(false)
  }

  async function fetchColumns() {
    if (!form.savantCsvUrl) return
    setFetchingColumns(true)
    setColumnFetchStatus('idle')
    try {
      const res = await fetch('/api/admin/savant-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: form.savantCsvUrl, contestSeason: parseInt(form.season) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setColumnFetchStatus('error')
        setColumnFetchMessage(data.error ?? 'Failed to fetch columns')
      } else {
        setAvailableColumns(data.columns)
        set('savantCsvUrl', data.liveUrl)
        setColumnFetchStatus('success')
        const yearNote = data.fromYear ? ` · ${data.fromYear} → ${form.season}` : ''
        setColumnFetchMessage(`✓ ${data.columns.length} columns loaded${yearNote}`)
      }
    } catch {
      setColumnFetchStatus('error')
      setColumnFetchMessage('Network error')
    } finally {
      setFetchingColumns(false)
    }
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      setSweepstakesPhoto(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    setEditError('')
    setEditSuccess(false)

    if (!metricConfig) {
      setEditError('Metric configuration is required')
      return
    }

    setSavingEdit(true)
    try {
      const draftLocalMs = new Date(`${form.draftOpenAt}T${form.draftTime}:00`).getTime()
      const draftOpenAt = new Date(draftLocalMs).toISOString()
      const draftCloseAt = new Date(draftLocalMs + 3 * 60 * 60 * 1000).toISOString()
      const res = await fetch(`/api/admin/contests/${contest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, draftOpenAt, draftCloseAt, metricConfig, sweepstakesPhoto }),
      })
      if (res.ok) {
        setEditSuccess(true)
        router.refresh()
      } else {
        const d = await res.json()
        setEditError(d.error ?? 'Save failed')
      }
    } catch {
      setEditError('Network error')
    } finally {
      setSavingEdit(false)
    }
  }

  const nonAdminIds = new Set(nonAdminManagers.map((m) => m.id))

  // Manual pick overrides
  const [manualPicks, setManualPicks] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const p of picks) m[p.managerId] = p.teamCode
    return m
  })
  const [savingPickFor, setSavingPickFor] = useState<string | null>(null)
  const [clearingPickFor, setClearingPickFor] = useState<string | null>(null)
  const [pickError, setPickError] = useState<Record<string, string>>({})
  const savedPickIds = new Set(picks.map((p) => p.managerId))

  async function handleSetPick(managerId: string) {
    const teamCode = manualPicks[managerId]
    if (!teamCode) return
    setSavingPickFor(managerId)
    setPickError((e) => ({ ...e, [managerId]: '' }))
    try {
      const res = await fetch(`/api/admin/contests/${contest.id}/pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId, teamCode }),
      })
      if (res.ok) {
        router.refresh()
      } else {
        const d = await res.json()
        setPickError((e) => ({ ...e, [managerId]: d.error ?? 'Failed to set pick' }))
      }
    } catch {
      setPickError((e) => ({ ...e, [managerId]: 'Network error' }))
    } finally {
      setSavingPickFor(null)
    }
  }

  async function handleClearPick(managerId: string) {
    setClearingPickFor(managerId)
    setPickError((e) => ({ ...e, [managerId]: '' }))
    try {
      const res = await fetch(`/api/admin/contests/${contest.id}/pick`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId }),
      })
      if (res.ok) {
        setManualPicks((m) => { const next = { ...m }; delete next[managerId]; return next })
        router.refresh()
      } else {
        const d = await res.json()
        setPickError((e) => ({ ...e, [managerId]: d.error ?? 'Failed to clear pick' }))
      }
    } catch {
      setPickError((e) => ({ ...e, [managerId]: 'Network error' }))
    } finally {
      setClearingPickFor(null)
    }
  }

  // Draft order editor — admins excluded
  const [orderedIds, setOrderedIds] = useState<string[]>(
    draftSlots.length > 0
      ? draftSlots.map((s) => s.managerId).filter((id) => nonAdminIds.has(id))
      : nonAdminManagers.map((m) => m.id)
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

  function removeFromOrder(index: number) {
    setOrderedIds((ids) => ids.filter((_, i) => i !== index))
  }

  async function handleRandomize() {
    setSavingOrder(true)
    try {
      const res = await fetch(`/api/admin/draft-order/${contest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ randomize: true }),
      })
      if (res.ok) router.refresh()
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
      if (res.ok) router.refresh()
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

  async function handleSetDraftOrderFromPrior() {
    setSettingDraftOrder(true)
    setDraftOrderMessage('')
    try {
      const res = await fetch(`/api/admin/draft-order/${contest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromPriorStandings: true }),
      })
      if (res.ok) {
        router.refresh()
      } else {
        const d = await res.json()
        setDraftOrderMessage(d.error ?? 'Failed to set draft order')
      }
    } catch {
      setDraftOrderMessage('Network error')
    } finally {
      setSettingDraftOrder(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${contest.name}"? This will remove all picks, standings, and draft data.`)) return
    setDeleting(true)
    const res = await fetch(`/api/admin/contests/${contest.id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/admin')
    } else {
      setDeleting(false)
      alert('Delete failed')
    }
  }

  const idToUsername = Object.fromEntries(allManagers.map((m) => [m.id, m.username]))

  const statusColors: Record<string, string> = {
    UPCOMING: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    DRAFTING: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    ACTIVE: 'bg-green-500/10 text-green-400 border border-green-500/20',
    COMPLETED: 'bg-zinc-800 text-zinc-500 border border-zinc-700',
  }

  return (
    <div className="space-y-6">
      <div>
        <a href="/admin" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">← Contests</a>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-xl font-semibold text-white">{contest.name}</h1>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm font-semibold text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>

      {/* ── Edit form ── */}
      <form onSubmit={handleSaveEdit} className={`${card} p-4 space-y-4`}>
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Contest Details</h2>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[contest.status] ?? ''}`}>
            {contest.status}
          </span>
        </div>

        <Field label="Contest #">
          <input type="number" value={form.weekNumber} onChange={(e) => set('weekNumber', e.target.value)} className={inputClass} min={1} required />
        </Field>
        <Field label="Season">
          <input type="number" value={form.season} onChange={(e) => set('season', e.target.value)} className={inputClass} required />
        </Field>

        <Field label="Contest Name">
          <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} className={inputClass} required />
        </Field>

        <Field label="Contest Metric">
          <input type="text" value={form.metricName} onChange={(e) => set('metricName', e.target.value)} className={inputClass} required />
        </Field>

        <Field label="Commissioner Message">
          <textarea
            value={form.commissionerMessage}
            onChange={(e) => set('commissionerMessage', e.target.value)}
            className={inputClass + ' min-h-[120px] resize-y'}
            placeholder="Message to display on upcoming draft cards…"
          />
        </Field>

        <Field label="Sweepstakes Description">
          <textarea
            value={form.metricDescription}
            onChange={(e) => set('metricDescription', e.target.value)}
            className={inputClass + ' min-h-[100px] resize-y'}
          />
        </Field>

        <Field label="Sweepstakes Photo">
          <label className="flex items-center gap-3 cursor-pointer">
            <span className="flex-shrink-0 bg-[#1a1a1a] hover:bg-[#262626] border border-[#262626] text-zinc-300 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
              {photoFileName ?? 'Choose photo'}
            </span>
            <input
              type="file"
              accept="image/*,.heic,.heif"
              onChange={handlePhotoUpload}
              className="sr-only"
            />
          </label>
          {sweepstakesPhoto && (
            <div className="mt-2 relative">
              <img src={sweepstakesPhoto} alt="Sweepstakes" className="w-full max-h-48 object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => { setSweepstakesPhoto(null); setPhotoFileName(null) }}
                className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white text-xs px-2 py-1 rounded transition-colors"
              >
                Remove
              </button>
            </div>
          )}
        </Field>

        <Field label="Start Date">
          <MonthDayInput value={form.startDate} onChange={(v) => set('startDate', v)} required />
        </Field>
        <Field label="End Date">
          <MonthDayInput value={form.endDate} onChange={(v) => set('endDate', v)} required />
        </Field>
        <Field label="Draft Opens">
          <MonthDayInput value={form.draftOpenAt} onChange={(v) => set('draftOpenAt', v)} required />
        </Field>
        <Field label="Draft Start">
          <input type="time" value={form.draftTime} onChange={(e) => set('draftTime', e.target.value)} className={inputClass} required />
        </Field>
        <p className="text-xs text-zinc-600">Draft closes 3 hrs after open</p>

        <Field label="Baseball Savant URL" hint="Paste the backdated URL (prior year dates) — Fetch will load columns and rewrite to this season's URL">
          <div className="flex gap-2">
            <input
              type="url"
              value={form.savantCsvUrl}
              onChange={(e) => { set('savantCsvUrl', e.target.value); setColumnFetchStatus('idle') }}
              className={inputClass}
            />
            <button
              type="button"
              onClick={fetchColumns}
              disabled={fetchingColumns || !form.savantCsvUrl}
              className="flex-shrink-0 bg-[#1a1a1a] hover:bg-[#262626] border border-[#262626] text-zinc-300 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-40"
            >
              {fetchingColumns ? '…' : 'Fetch'}
            </button>
          </div>
          {columnFetchStatus === 'success' && <p className="text-xs text-green-400 mt-1">{columnFetchMessage}</p>}
          {columnFetchStatus === 'error' && <p className="text-xs text-red-400 mt-1">{columnFetchMessage}</p>}
        </Field>

        <Field label="Draft Window (minutes)">
          <input type="number" value={form.cascadeWindowMinutes} onChange={(e) => set('cascadeWindowMinutes', e.target.value)} className={inputClass} min={1} required />
        </Field>

        <div>
          <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">Metric</label>
          <MetricBuilderSection initialConfig={initialMetricConfig} onChange={setMetricConfig} availableColumns={availableColumns} />
        </div>

        {editError && <p className="text-red-400 text-sm">{editError}</p>}
        {editSuccess && <p className="text-green-400 text-sm">Saved.</p>}

        <button
          type="submit"
          disabled={savingEdit}
          className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-semibold rounded-lg py-2.5 transition-colors"
        >
          {savingEdit ? 'Saving…' : 'Save Changes'}
        </button>
      </form>

      {/* ── Update Standings ── */}
      <div className={`${card} p-4 space-y-3`}>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Update Standings</h2>
        {contest.lastPolledAt && (
          <p className="text-xs text-zinc-600">Last polled: {new Date(contest.lastPolledAt).toLocaleString()}</p>
        )}
        <button
          onClick={handlePoll}
          disabled={polling}
          className="bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-medium px-4 py-2 rounded-lg text-sm transition-colors"
        >
          {polling ? 'Polling…' : 'Poll Now'}
        </button>
        {pollMessage && <p className="text-sm text-zinc-400">{pollMessage}</p>}
      </div>

      {/* ── Draft order ── */}
      <div className={`${card} p-4 space-y-3`}>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Draft Order</h2>
        <div className="space-y-2">
          {orderedIds.map((id, i) => {
            const currentTeam = manualPicks[id]
            const isSaving = savingPickFor === id
            const isClearing = clearingPickFor === id
            const hasSavedPick = savedPickIds.has(id)
            const err = pickError[id]
            return (
              <div key={id} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-600 text-sm w-5 tabular-nums">{i + 1}</span>
                  <span className="flex-1 text-sm font-medium text-zinc-200">{idToUsername[id] ?? id}</span>
                  <button onClick={() => moveUp(i)} disabled={i === 0} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-30 px-1 transition-colors">↑</button>
                  <button onClick={() => moveDown(i)} disabled={i === orderedIds.length - 1} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-30 px-1 transition-colors">↓</button>
                  <button onClick={() => removeFromOrder(i)} className="text-zinc-700 hover:text-red-400 px-1 text-sm transition-colors">✕</button>
                </div>
                <div className="flex items-center gap-2 pl-7">
                  <select
                    value={currentTeam ?? ''}
                    onChange={(e) => setManualPicks((m) => ({ ...m, [id]: e.target.value }))}
                    className="flex-1 rounded-lg border border-[#262626] bg-[#0a0a0a] px-2 py-1.5 text-xs text-zinc-100 focus:border-green-500 focus:outline-none transition-colors appearance-none"
                  >
                    <option value="">— select team —</option>
                    {MLB_TEAMS.map((t) => (
                      <option key={t.code} value={t.code}>{t.abbreviation} — {t.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleSetPick(id)}
                    disabled={isSaving || !currentTeam}
                    className="flex-shrink-0 bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {isSaving ? '…' : 'Set'}
                  </button>
                  {hasSavedPick && (
                    <button
                      type="button"
                      onClick={() => handleClearPick(id)}
                      disabled={isClearing}
                      className="flex-shrink-0 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                    >
                      {isClearing ? '…' : 'Clear'}
                    </button>
                  )}
                </div>
                {err && <p className="text-xs text-red-400 pl-7">{err}</p>}
              </div>
            )
          })}
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={handleSetDraftOrderFromPrior} disabled={settingDraftOrder} className="flex-1 bg-[#1a1a1a] hover:bg-[#262626] border border-[#262626] text-zinc-300 font-medium py-2 rounded-lg text-sm transition-colors disabled:opacity-40">
            {settingDraftOrder ? 'Setting…' : 'Draft Order'}
          </button>
          <button onClick={handleRandomize} disabled={savingOrder} className="flex-1 bg-[#1a1a1a] hover:bg-[#262626] border border-[#262626] text-zinc-300 font-medium py-2 rounded-lg text-sm transition-colors">
            Randomize
          </button>
          <button onClick={handleSaveOrder} disabled={savingOrder} className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-medium py-2 rounded-lg text-sm transition-colors">
            {savingOrder ? 'Saving…' : 'Save Order'}
          </button>
        </div>
        {draftOrderMessage && <p className="text-sm text-red-400">{draftOrderMessage}</p>}
      </div>

      {/* ── Standings ── */}
      {standings.length > 0 && (
        <div className={`${card} p-4 space-y-3`}>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Current Standings</h2>
          <div className="space-y-1">
            {standings.map((s) => (
              <div key={s.managerId} className="flex items-center gap-3 text-sm">
                <span className="text-zinc-600 w-5 tabular-nums">{(() => {
                  const freq = standings.filter(x => x.rank === s.rank).length
                  return s.rank == null ? '—' : freq > 1 ? `T${s.rank}` : s.rank
                })()}</span>
                <span className="flex-1 font-medium text-zinc-200">{s.username}</span>
                <span className="text-zinc-500">{getTeam(s.teamCode)?.abbreviation ?? s.teamCode}</span>
                <span className="font-bold text-green-400 tabular-nums">
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
