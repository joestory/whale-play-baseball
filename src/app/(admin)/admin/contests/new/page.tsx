'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const DEFAULT_METRIC_CONFIG = JSON.stringify(
  {
    columns: { hr: 'home_run' },
    teamColumn: 'player_team',
    aggregation: [{ alias: 'hr', op: 'SUM' }],
    unit: 'HR',
    higherIsBetter: true,
  },
  null,
  2
)

export default function NewContestPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const now = new Date()
  const pad = (d: Date) => d.toISOString().slice(0, 16)

  const [form, setForm] = useState({
    name: '',
    weekNumber: '',
    season: String(now.getFullYear()),
    metricName: '',
    metricDescription: '',
    savantCsvUrl: '',
    metricConfig: DEFAULT_METRIC_CONFIG,
    startDate: pad(now),
    endDate: pad(new Date(now.getTime() + 7 * 86400000)),
    draftOpenAt: pad(now),
    draftCloseAt: pad(new Date(now.getTime() + 86400000)),
    cascadeWindowMinutes: '60',
  })

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    let metricConfig
    try {
      metricConfig = JSON.parse(form.metricConfig)
    } catch {
      setError('Metric config must be valid JSON')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/contests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, metricConfig }),
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
        <a href="/admin" className="text-sm text-slate-500 hover:text-slate-700">← Admin</a>
        <h1 className="text-2xl font-bold mt-1">New Contest</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          <h2 className="font-semibold text-slate-700">Basic Info</h2>

          <Field label="Contest Name">
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Week 1 — 2025"
              className={inputClass}
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Week #">
              <input
                type="number"
                value={form.weekNumber}
                onChange={(e) => set('weekNumber', e.target.value)}
                className={inputClass}
                min={1}
                required
              />
            </Field>
            <Field label="Season">
              <input
                type="number"
                value={form.season}
                onChange={(e) => set('season', e.target.value)}
                className={inputClass}
                required
              />
            </Field>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          <h2 className="font-semibold text-slate-700">Metric</h2>

          <Field label="Metric Name">
            <input
              type="text"
              value={form.metricName}
              onChange={(e) => set('metricName', e.target.value)}
              placeholder="Total Home Runs"
              className={inputClass}
              required
            />
          </Field>

          <Field label="Metric Description (optional)">
            <input
              type="text"
              value={form.metricDescription}
              onChange={(e) => set('metricDescription', e.target.value)}
              placeholder="Sum of all home runs hit by the drafted team"
              className={inputClass}
            />
          </Field>

          <Field label="Baseball Savant CSV URL">
            <input
              type="url"
              value={form.savantCsvUrl}
              onChange={(e) => set('savantCsvUrl', e.target.value)}
              placeholder="https://baseballsavant.mlb.com/statcast_search/csv?..."
              className={inputClass}
              required
            />
          </Field>

          <Field label="Metric Config (JSON)">
            <textarea
              value={form.metricConfig}
              onChange={(e) => set('metricConfig', e.target.value)}
              className={`${inputClass} font-mono text-xs`}
              rows={10}
              required
            />
            <p className="text-xs text-slate-400 mt-1">
              Define columns, teamColumn, aggregation steps, unit, and higherIsBetter
            </p>
          </Field>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          <h2 className="font-semibold text-slate-700">Dates</h2>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Contest Start">
              <input
                type="datetime-local"
                value={form.startDate}
                onChange={(e) => set('startDate', e.target.value)}
                className={inputClass}
                required
              />
            </Field>
            <Field label="Contest End">
              <input
                type="datetime-local"
                value={form.endDate}
                onChange={(e) => set('endDate', e.target.value)}
                className={inputClass}
                required
              />
            </Field>
            <Field label="Draft Opens">
              <input
                type="datetime-local"
                value={form.draftOpenAt}
                onChange={(e) => set('draftOpenAt', e.target.value)}
                className={inputClass}
                required
              />
            </Field>
            <Field label="Draft Closes">
              <input
                type="datetime-local"
                value={form.draftCloseAt}
                onChange={(e) => set('draftCloseAt', e.target.value)}
                className={inputClass}
                required
              />
            </Field>
          </div>

          <Field label="Cascade Window (minutes)">
            <input
              type="number"
              value={form.cascadeWindowMinutes}
              onChange={(e) => set('cascadeWindowMinutes', e.target.value)}
              className={inputClass}
              min={1}
              required
            />
            <p className="text-xs text-slate-400 mt-1">
              Time before the next manager also becomes eligible
            </p>
          </Field>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl py-3 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-xl py-3 transition-colors"
          >
            {submitting ? 'Creating…' : 'Create Contest'}
          </button>
        </div>
      </form>
    </div>
  )
}

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  )
}
