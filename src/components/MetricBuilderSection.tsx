'use client'

import { useState, useEffect } from 'react'
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
  primary: MetricDef,
  related: MetricDef[],
  higherIsBetter: boolean,
  teamSide: 'batting' | 'pitching',
): MetricConfig {
  const { columns, steps } = buildAggregation(primary)
  const relatedMetrics: RelatedMetric[] = related.map((r, i) => {
    const { columns: rc, steps: rs, resultAlias: rAlias } = buildAggregation(r, `r${i}_`)
    return { name: r.name, columns: rc, aggregation: rs, resultAlias: rAlias, unit: r.unit }
  })
  return {
    columns,
    teamColumn: 'player_name',
    dateColumn: 'game_date',
    aggregation: steps,
    unit: primary.unit,
    higherIsBetter,
    teamSide,
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
    higherIsBetter: config.higherIsBetter !== false,
    teamSide: config.teamSide ?? 'batting' as 'batting' | 'pitching',
    primary: parseMetricDef(config.columns, config.aggregation as MetricAggregationStep[], '', config.unit),
    related: (config.relatedMetrics ?? []).map((r) =>
      parseMetricDef(r.columns, r.aggregation as MetricAggregationStep[], r.name, r.unit)
    ),
  }
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
          <div className="space-y-3">
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

  const [higherIsBetter, setHigherIsBetter] = useState(parsed?.higherIsBetter ?? true)
  const [teamSide, setTeamSide] = useState<'batting' | 'pitching'>(parsed?.teamSide ?? 'batting')
  const [primary, setPrimary] = useState<MetricDef>(parsed?.primary ?? emptyMetric())
  const [related, setRelated] = useState<MetricDef[]>(parsed?.related ?? [])
  const effectiveHeaders = availableColumns ?? []

  useEffect(() => {
    onChange(buildMetricConfig(primary, related, higherIsBetter, teamSide))
  // onChange is a stable setState setter — safe to omit from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primary, related, higherIsBetter, teamSide])

  return (
    <div className="space-y-4">

      {/* Column source — from Savant URL fetch */}
      {availableColumns?.length ? (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-green-400 font-medium">✓ {availableColumns.length} columns from Savant URL</span>
        </div>
      ) : null}

      {/* Primary metric */}
      <div className="border border-[#262626] rounded-lg p-3 space-y-3 bg-[#1a1a1a]">
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Primary Metric</p>

        <Field label="Attributed to" hint="Which team the stat is counted against">
          <Switch<'batting' | 'pitching'>
            options={[{ label: 'Batting Team', value: 'batting' }, { label: 'Pitching Team', value: 'pitching' }]}
            value={teamSide}
            onChange={setTeamSide}
          />
        </Field>

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
