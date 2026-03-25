'use client'

import { useState, useEffect } from 'react'

type Manager = {
  id: string
  username: string
  icon: string | null
  isAdmin: boolean
  createdAt: string
}

const ICON_OPTIONS = ['⚾', '🦈', '🐋', '🔥', '⚡', '🦁', '🐺', '🦊', '🐻', '🦅', '💎', '🏆', '🎯', '🌊', '🚀']

const inputCls = 'w-full rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-green-500 focus:outline-none transition-colors'
const labelCls = 'block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5'

export default function AdminManagersPage() {
  const [managers, setManagers] = useState<Manager[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [newForm, setNewForm] = useState({ username: '', password: '', icon: '⚾' })
  const [editForm, setEditForm] = useState({ username: '', icon: '' })
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    try {
      const res = await fetch('/api/admin/managers')
      const data = await res.json()
      setManagers(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load managers:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed'); return }
      setManagers((m) => [...m, data].sort((a, b) => a.username.localeCompare(b.username)))
      setNewForm({ username: '', password: '', icon: '⚾' })
      setShowForm(false)
    } finally {
      setSubmitting(false)
    }
  }

  function startEdit(m: Manager) {
    setEditingId(m.id)
    setEditForm({ username: m.username, icon: m.icon ?? '⚾' })
  }

  async function handleSaveEdit(id: string) {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/managers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const data = await res.json()
      if (res.ok) {
        setManagers((m) => m.map((x) => (x.id === id ? { ...x, ...data } : x)))
        setEditingId(null)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResetPassword(id: string, username: string) {
    const newPass = prompt(`New password for ${username}:`)
    if (!newPass) return
    await fetch(`/api/admin/managers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPass }),
    })
  }

  async function handleDelete(id: string, username: string) {
    if (!confirm(`Delete manager "${username}"? This cannot be undone.`)) return
    const res = await fetch(`/api/admin/managers/${id}`, { method: 'DELETE' })
    if (res.ok) setManagers((m) => m.filter((x) => x.id !== id))
  }

  if (loading) return <div className="text-zinc-500 py-12 text-center">Loading…</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white pt-2">Managers</h1>
          <p className="text-sm text-zinc-500">{managers.length} managers</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-green-500 hover:bg-green-400 text-black text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          + Add Manager
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-[#111111] rounded-xl border border-[#1f1f1f] p-5 space-y-4">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">New Manager</h2>

          <div>
            <label className={labelCls}>Username</label>
            <input type="text" value={newForm.username} onChange={(e) => setNewForm((f) => ({ ...f, username: e.target.value }))} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Password</label>
            <input type="text" value={newForm.password} onChange={(e) => setNewForm((f) => ({ ...f, password: e.target.value }))} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Icon</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setNewForm((f) => ({ ...f, icon }))}
                  className={`w-10 h-10 text-xl rounded-lg border transition-colors ${newForm.icon === icon ? 'border-green-500 bg-green-500/10' : 'border-[#262626] bg-[#0a0a0a] hover:border-zinc-500'}`}
                >
                  {icon}
                </button>
              ))}
            </div>
            <input type="text" value={newForm.icon} onChange={(e) => setNewForm((f) => ({ ...f, icon: e.target.value }))} className={inputCls} placeholder="Or type any emoji" maxLength={4} />
          </div>
          {error && <p className="text-red-400 text-sm font-medium">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-[#1a1a1a] hover:bg-[#262626] border border-[#262626] text-zinc-300 font-semibold py-2.5 rounded-lg text-sm transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-semibold py-2.5 rounded-lg text-sm transition-colors">
              {submitting ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      )}

      {/* Manager list */}
      <div className="space-y-2">
        {managers.map((m) =>
          editingId === m.id ? (
            /* Inline edit */
            <div key={m.id} className="bg-[#111111] rounded-xl border border-green-500 p-4 space-y-3">
              <div>
                <label className={labelCls}>Username</label>
                <input type="text" value={editForm.username} onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Icon</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setEditForm((f) => ({ ...f, icon }))}
                      className={`w-10 h-10 text-xl rounded-lg border transition-colors ${editForm.icon === icon ? 'border-green-500 bg-green-500/10' : 'border-[#262626] bg-[#0a0a0a] hover:border-zinc-500'}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
                <input type="text" value={editForm.icon} onChange={(e) => setEditForm((f) => ({ ...f, icon: e.target.value }))} className={inputCls} placeholder="Or type any emoji" maxLength={4} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingId(null)} className="flex-1 bg-[#1a1a1a] hover:bg-[#262626] border border-[#262626] text-zinc-300 font-semibold py-2 rounded-lg text-sm transition-colors">
                  Cancel
                </button>
                <button onClick={() => handleSaveEdit(m.id)} disabled={submitting} className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-semibold py-2 rounded-lg text-sm transition-colors">
                  Save
                </button>
              </div>
            </div>
          ) : (
            /* Display row */
            <div key={m.id} className="bg-[#111111] rounded-xl border border-[#1f1f1f] px-4 py-3 flex items-center gap-3">
              <span className="text-xl w-9 text-center">{m.icon ?? '⚾'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-zinc-100">{m.username}</p>
              </div>
              <button onClick={() => startEdit(m)} className="text-xs font-medium text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded hover:bg-[#1a1a1a] transition-colors">
                Edit
              </button>
              <button onClick={() => handleResetPassword(m.id, m.username)} className="text-xs font-medium text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded hover:bg-[#1a1a1a] transition-colors">
                Reset PW
              </button>
              <button onClick={() => handleDelete(m.id, m.username)} className="text-xs font-medium text-red-500 hover:text-red-400 px-2 py-1 rounded hover:bg-red-500/10 transition-colors">
                Delete
              </button>
            </div>
          )
        )}
      </div>
    </div>
  )
}
