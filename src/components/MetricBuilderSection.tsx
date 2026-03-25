'use client'

import { useState, useEffect, useRef } from 'react'
import type { MetricConfig, MetricAggregationStep, RelatedMetric } from '@/types'

// ─── Internal types ────────────────────────────────────────────────────────────

type AggType = 'sum' | 'ratio'

type MetricDef = {
  name: string
  unit: string
  aggType: AggType
  column: string
  denominator: string
  multiply: string
}

function emptyMetric(name = '', unit = ''): MetricDef {
  return { name, unit, aggType: 'sum', column: '', denominator: '', multiply: '1' }
}

// ─── Build MetricConfig from UI state ─────────────────────────────────────────

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'val'
}

function buildAggregation(def: MetricDef, prefix = ''): {
  columns: Record<string, string>
  steps: MetricAggregationStep[]
  resultAlias: string
} {
  const columns: Record<string, string> = {}
  const steps: MetricAggregationStep[] = []

  if (def.aggType === 'sum') {
    const alias = prefix + slug(def.column)
    columns[alias] = def.column
    steps.push({ alias, op: 'SUM' })
    return { columns, steps, resultAlias: alias }
  }

  const numAlias = prefix + slug(def.column)
  const denAlias = prefix + slug(def.denominator)
  const resultAlias = prefix + 'result'
  columns[numAlias] = def.column
  columns[denAlias] = def.denominator
  steps.push({ alias: numAlias, op: 'SUM' })
  steps.push({ alias: denAlias, op: 'SUM' })
  steps.push({ alias: resultAlias, op: 'DIV', numerator: numAlias, denominator: denAlias, multiply: parseFloat(def.multiply) || 1 })
  return { columns, steps, resultAlias }
}

function buildMetricConfig(
  teamColumn: string,
  dateColumn: string,
  primary: MetricDef,
  related: MetricDef[],
  higherIsBetter: boolean,
): MetricConfig {
  const { columns, steps } = buildAggregation(primary)
  const relatedMetrics: RelatedMetric[] = related.map((r, i) => {
    const { columns: rc, steps: rs, resultAlias: rAlias } = buildAggregation(r, `r${i}_`)
    return { name: r.name, columns: rc, aggregation: rs, resultAlias: rAlias, unit: r.unit }
  })
  return {
    columns,
    teamColumn,
    dateColumn: dateColumn || undefined,
    aggregation: steps,
    unit: primary.unit,
    higherIsBetter,
    relatedMetrics: relatedMetrics.length > 0 ? relatedMetrics : undefined,
  }
}

// ─── Parse MetricConfig back into UI state ────────────────────────────────────

function parseMetricDef(
  columns: Record<string, string>,
  aggregation: MetricAggregationStep[],
  name: string,
  unit: string,
): MetricDef {
  const divStep = aggregation.find((s): s is Extract<MetricAggregationStep, { op: 'DIV' }> => s.op === 'DIV')
  if (divStep) {
    return {
      name, unit, aggType: 'ratio',
      column: columns[divStep.numerator] ?? divStep.numerator,
      denominator: columns[divStep.denominator] ?? divStep.denominator,
      multiply: String(divStep.multiply ?? 1),
    }
  }
  const sumStep = aggregation.find((s) => s.op === 'SUM')
  return {
    name, unit, aggType: 'sum',
    column: sumStep ? (columns[sumStep.alias] ?? sumStep.alias) : '',
    denominator: '', multiply: '1',
  }
}

function parseMetricConfig(config: MetricConfig) {
  return {
    teamColumn: config.teamColumn ?? 'pitcher_team',
    dateColumn: config.dateColumn ?? 'game_date',
    higherIsBetter: config.higherIsBetter !== false,
    primary: parseMetricDef(config.columns, config.aggregation as MetricAggregationStep[], '', config.unit),
    related: (config.relatedMetrics ?? []).map((r) =>
      parseMetricDef(r.columns, r.aggregation as MetricAggregationStep[], r.name, r.unit)
    ),
  }
}

// ─── CSV header parser ────────────────────────────────────────────────────────

function parseCSVHeaders(text: string): string[] {
  const firstLine = text.split(/\r?\n/)[0] ?? ''
  const headers: string[] = []
  let current = ''
  let inQuotes = false
  for (const ch of firstLine) {
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { headers.push(current.trim().replace(/^"|"$/g, '')); current = '' }
    else { current += ch }
  }
  if (current.trim()) headers.push(current.trim().replace(/^"|"$/g, ''))
  return headers.filter(Boolean)
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

const inputClass =
  'w-full rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-green-500 focus:outline-none transition-colors'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-zinc-600 mt-1">{hint}</p>}
    </div>
  )
}

function Switch<T extends string | boolean>({ options, value, onChange }: {
  options: { label: string; value: T }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex rounded-lg border border-[#262626] bg-[#0a0a0a] overflow-hidden">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-2 text-sm font-medium transition-colors ${
            value === opt.value
              ? 'bg-green-500 text-black'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function ColumnSelect({ value, onChange, headers, placeholder, required }: {
  value: string
  onChange: (v: string) => void
  headers: string[]
  placeholder?: string
  required?: boolean
}) {
  if (headers.length === 0) {
    return (
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} className={inputClass} required={required} />
    )
  }
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} required={required}>
      <option value="">— select column —</option>
      {headers.map((h) => <option key={h} value={h}>{h}</option>)}
    </select>
  )
}

function MetricDefEditor({ value, onChange, showName, headers }: {
  value: MetricDef
  onChange: (v: MetricDef) => void
  showName: boolean
  headers: string[]
}) {
  function set<K extends keyof MetricDef>(k: K, v: MetricDef[K]) {
    onChange({ ...value, [k]: v })
  }

  return (
    <div className="space-y-3">
      {showName && (
        <Field label="Name">
          <input type="text" value={value.name} onChange={(e) => set('name', e.target.value)}
            placeholder="Whiffs" className={inputClass} required />
        </Field>
      )}
      <Field label="Calculation type">
        <Switch<AggType>
          options={[{ label: 'SUM', value: 'sum' }, { label: 'Ratio', value: 'ratio' }]}
          value={value.aggType}
          onChange={(v) => set('aggType', v)}
        />
      </Field>

      {value.aggType === 'sum' ? (
        <Field label="Column to sum"
          hint={headers.length ? undefined : 'Fetch the Savant URL above to populate column dropdowns'}>
          <ColumnSelect value={value.column} onChange={(v) => set('column', v)}
            headers={headers} placeholder="e.g. whiff" required />
        </Field>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Numerator column">
              <ColumnSelect value={value.column} onChange={(v) => set('column', v)}
                headers={headers} placeholder="e.g. whiff" required />
            </Field>
            <Field label="Denominator column">
              <ColumnSelect value={value.denominator} onChange={(v) => set('denominator', v)}
                headers={headers} placeholder="e.g. swing" required />
            </Field>
          </div>
          <Field label="Multiplier">
            <Switch<string>
              options={[{ label: 'Percentage', value: '100' }, { label: 'Ratio', value: '1' }]}
              value={value.multiply === '100' ? '100' : '1'}
              onChange={(v) => set('multiply', v)}
            />
          </Field>
        </>
      )}
    </div>
  )
}

// ─── Main exported component ──────────────────────────────────────────────────

export default function MetricBuilderSection({
  initialConfig,
  onChange,
  availableColumns,
}: {
  initialConfig?: MetricConfig | null
  onChange: (config: MetricConfig) => void
  availableColumns?: string[]
}) {
  const parsed = initialConfig ? parseMetricConfig(initialConfig) : null

  const [teamColumn, setTeamColumn] = useState(parsed?.teamColumn ?? 'pitcher_team')
  const [dateColumn, setDateColumn] = useState(parsed?.dateColumn ?? 'game_date')
  const [higherIsBetter, setHigherIsBetter] = useState(parsed?.higherIsBetter ?? true)
  const [primary, setPrimary] = useState<MetricDef>(parsed?.primary ?? emptyMetric())
  const [related, setRelated] = useState<MetricDef[]>(parsed?.related ?? [])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvFileName, setCsvFileName] = useState('')

  // Columns from URL fetch take priority over file upload
  const effectiveHeaders = availableColumns?.length ? availableColumns : csvHeaders

  // Stable ref to avoid stale closure in effect
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    onChangeRef.current(buildMetricConfig(teamColumn, dateColumn, primary, related, higherIsBetter))
  }, [teamColumn, dateColumn, primary, related, higherIsBetter])

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCsvHeaders(parseCSVHeaders(ev.target?.result as string))
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-4">

      {/* Column source — URL-fetched or file upload */}
      {availableColumns?.length ? (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-green-400 font-medium">✓ {availableColumns.length} columns from Savant URL</span>
        </div>
      ) : (
        <Field label="Upload Sample CSV">
          <label className="flex items-center gap-3 cursor-pointer">
            <span className="flex-shrink-0 bg-[#1a1a1a] hover:bg-[#262626] border border-[#262626] text-zinc-300 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
              Choose file
            </span>
            <span className="text-sm text-zinc-600 truncate">
              {csvFileName || 'No file chosen'}
            </span>
            <input type="file" accept=".csv,text/csv" onChange={handleCsvUpload} className="sr-only" />
          </label>
          {csvHeaders.length > 0 && (
            <p className="text-xs text-green-400 mt-1">
              {csvHeaders.length} columns detected — dropdowns enabled below.
            </p>
          )}
        </Field>
      )}

      {/* Team / date columns */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Team column">
          <ColumnSelect value={teamColumn} onChange={setTeamColumn}
            headers={effectiveHeaders} placeholder="e.g. pitcher_team" required />
        </Field>
        <Field label="Date column">
          <ColumnSelect value={dateColumn} onChange={setDateColumn}
            headers={effectiveHeaders} placeholder="e.g. game_date" />
        </Field>
      </div>

      {/* Primary metric */}
      <div className="border border-[#262626] rounded-lg p-3 space-y-3 bg-[#1a1a1a]">
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Primary Metric</p>

        <Field label="Higher Score Wins?">
          <Switch<boolean>
            options={[{ label: 'Yes', value: true }, { label: 'No', value: false }]}
            value={higherIsBetter}
            onChange={setHigherIsBetter}
          />
        </Field>

        <MetricDefEditor value={primary} onChange={setPrimary} showName={false} headers={effectiveHeaders} />
      </div>

      {/* Related metrics */}
      {related.map((r, i) => (
        <div key={i} className="border border-[#262626] rounded-lg p-3 space-y-3 bg-[#1a1a1a]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Related Metric {i + 1}</span>
            <button type="button" onClick={() => setRelated((rs) => rs.filter((_, idx) => idx !== i))}
              className="text-xs font-semibold text-red-400 hover:text-red-300 px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors">Remove</button>
          </div>
          <MetricDefEditor
            value={r}
            onChange={(v) => setRelated((rs) => rs.map((x, idx) => idx === i ? v : x))}
            showName={true}
            headers={effectiveHeaders}
          />
        </div>
      ))}

      <button type="button" onClick={() => setRelated((r) => [...r, emptyMetric()])}
        className="w-full py-2.5 rounded-lg border border-dashed border-[#262626] text-sm text-green-400 hover:text-green-300 hover:border-green-500/40 transition-colors">
        + Add Related Metric
      </button>
    </div>
  )
}
