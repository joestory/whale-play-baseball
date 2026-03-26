'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { MetricConfig } from '@/types'
import MetricBuilderSection from '@/components/MetricBuilderSection'

const inputClass =
  'w-full rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-green-500 focus:outline-none transition-colors'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-zinc-600 mt-1">{hint}</p>}
    </div>
  )
}

export default function NewContestPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [availableColumns, setAvailableColumns] = useState<string[]>([])
  const [fetchingColumns, setFetchingColumns] = useState(false)
  const [columnFetchStatus, setColumnFetchStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [columnFetchMessage, setColumnFetchMessage] = useState('')

  const now = new Date()
  const padDate = (d: Date) => d.toISOString().slice(0, 10)
  const padTime = (d: Date) => d.toISOString().slice(11, 16)

  const [basic, setBasic] = useState({
    name: '',
    weekNumber: '',
    season: String(now.getFullYear()),
    metricName: '',
    metricDescription: '',
    startDate: padDate(now),
    endDate: padDate(new Date(now.getTime() + 7 * 86400000)),
    draftOpenAt: padDate(now),
    draftTime: padTime(now),
    cascadeWindowMinutes: '1',
    savantCsvUrl: '',
  })

  const [metricConfig, setMetricConfig] = useState<MetricConfig | null>(null)

  function setBasicField(k: string, v: string) {
    setBasic((b) => ({ ...b, [k]: v }))
  }

  async function fetchColumns() {
    if (!basic.savantCsvUrl) return
    setFetchingColumns(true)
    setColumnFetchStatus('idle')
    try {
      const res = await fetch('/api/admin/savant-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: basic.savantCsvUrl, contestSeason: parseInt(basic.season) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setColumnFetchStatus('error')
        setColumnFetchMessage(data.error ?? 'Failed to fetch columns')
      } else {
        setAvailableColumns(data.columns)
        setBasicField('savantCsvUrl', data.liveUrl)
        setColumnFetchStatus('success')
        const yearNote = data.fromYear ? ` · ${data.fromYear} → ${basic.season}` : ''
        setColumnFetchMessage(`✓ ${data.columns.length} columns loaded${yearNote}`)
      }
    } catch {
      setColumnFetchStatus('error')
      setColumnFetchMessage('Network error')
    } finally {
      setFetchingColumns(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!basic.savantCsvUrl) {
      setError('CSV URL is required')
      return
    }
    if (!metricConfig) {
      setError('Metric configuration is required')
      return
    }

    setSubmitting(true)
    try {
      const draftOpenAt = `${basic.draftOpenAt}T${basic.draftTime}`
      const draftCloseAt = new Date(new Date(draftOpenAt).getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 16)
      const res = await fetch('/api/admin/contests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...basic,
          draftOpenAt,
          draftCloseAt,
          metricConfig,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create contest')
      } else {
        router.push(`/admin/contests/${data.id}`)
      }
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <a href="/admin" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">← Contests</a>
        <h1 className="text-xl font-semibold text-white mt-1">New Contest</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── Basic Info ── */}
        <div className="bg-[#111111] rounded-xl border border-[#1f1f1f] p-4 space-y-4">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Basic Info</h2>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Contest #">
              <input type="number" value={basic.weekNumber} onChange={(e) => setBasicField('weekNumber', e.target.value)} className={inputClass} min={1} required />
            </Field>
            <Field label="Season">
              <input type="number" value={basic.season} onChange={(e) => setBasicField('season', e.target.value)} className={inputClass} required />
            </Field>
          </div>

          <Field label="Contest Name">
            <input type="text" value={basic.name} onChange={(e) => setBasicField('name', e.target.value)} placeholder="Week 1 — 2025" className={inputClass} required />
          </Field>

          <Field label="Contest Description">
            <input type="text" value={basic.metricName} onChange={(e) => setBasicField('metricName', e.target.value)} placeholder="Total Whiffs" className={inputClass} />
          </Field>

          <Field label="Description (optional)">
            <input type="text" value={basic.metricDescription} onChange={(e) => setBasicField('metricDescription', e.target.value)} placeholder="Sum of all pitches whiffed on by the drafted team's pitchers" className={inputClass} />
          </Field>
        </div>

        {/* ── Dates ── */}
        <div className="bg-[#111111] rounded-xl border border-[#1f1f1f] p-4 space-y-4">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Dates</h2>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Contest Start">
              <MonthDayInput value={basic.startDate} onChange={(v) => setBasicField('startDate', v)} required />
            </Field>
            <Field label="Contest End">
              <MonthDayInput value={basic.endDate} onChange={(v) => setBasicField('endDate', v)} required />
            </Field>
            <Field label="Draft Opens">
              <MonthDayInput value={basic.draftOpenAt} onChange={(v) => setBasicField('draftOpenAt', v)} required />
            </Field>
            <Field label="Draft Start (EST)">
              <input type="time" value={basic.draftTime} onChange={(e) => setBasicField('draftTime', e.target.value)} className={inputClass} required />
            </Field>
          </div>
          <p className="text-xs text-zinc-600">Draft closes 3 hrs after open</p>

          <Field label="Draft Window (minutes)" hint="How long after one manager becomes eligible before the next one does">
            <input type="number" value={basic.cascadeWindowMinutes} onChange={(e) => setBasicField('cascadeWindowMinutes', e.target.value)} className={inputClass} min={1} required />
          </Field>

          <Field label="Baseball Savant URL" hint="Paste the backdated URL (prior year dates) — Fetch will load columns and rewrite to this season's URL">
            <div className="flex gap-2">
              <input
                type="url"
                value={basic.savantCsvUrl}
                onChange={(e) => { setBasicField('savantCsvUrl', e.target.value); setColumnFetchStatus('idle') }}
                placeholder="https://baseballsavant.mlb.com/statcast_search?..."
                className={inputClass}
              />
              <button
                type="button"
                onClick={fetchColumns}
                disabled={fetchingColumns || !basic.savantCsvUrl}
                className="flex-shrink-0 bg-[#1a1a1a] hover:bg-[#262626] border border-[#262626] text-zinc-300 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-40"
              >
                {fetchingColumns ? '…' : 'Fetch'}
              </button>
            </div>
            {columnFetchStatus === 'success' && <p className="text-xs text-green-400 mt-1">{columnFetchMessage}</p>}
            {columnFetchStatus === 'error' && <p className="text-xs text-red-400 mt-1">{columnFetchMessage}</p>}
          </Field>
        </div>

        {/* ── Metric Builder ── */}
        <div className="bg-[#111111] rounded-xl border border-[#1f1f1f] p-4 space-y-4">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Metric</h2>
          <MetricBuilderSection onChange={setMetricConfig} availableColumns={availableColumns} />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pb-8">
          <button type="button" onClick={() => router.back()} className="flex-1 bg-[#1a1a1a] hover:bg-[#262626] border border-[#262626] text-zinc-300 font-semibold rounded-lg py-2.5 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-semibold rounded-lg py-2.5 transition-colors">
            {submitting ? 'Creating…' : 'Create Contest'}
          </button>
        </div>
      </form>
    </div>
  )
}
