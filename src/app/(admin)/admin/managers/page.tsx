'use client'

import { useState, useEffect } from 'react'

type Manager = {
  id: string
  username: string
  isAdmin: boolean
  createdAt: string
}

export default function AdminManagersPage() {
  const [managers, setManagers] = useState<Manager[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newIsAdmin, setNewIsAdmin] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function loadManagers() {
    try {
      const res = await fetch('/api/admin/managers')
      const data = await res.json()
      setManagers(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadManagers() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword, isAdmin: newIsAdmin }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed')
      } else {
        setManagers((m) => [...m, data].sort((a, b) => a.username.localeCompare(b.username)))
        setNewUsername('')
        setNewPassword('')
        setNewIsAdmin(false)
        setShowForm(false)
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
    alert('Password updated!')
  }

  if (loading) return <div className="text-slate-400 py-8 text-center">Loading…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <a href="/admin" className="text-sm text-slate-500 hover:text-slate-700">← Admin</a>
          <h1 className="text-2xl font-bold mt-1">Managers</h1>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Add Manager
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <h2 className="font-semibold">New Manager</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={newIsAdmin}
              onChange={(e) => setNewIsAdmin(e.target.checked)}
            />
            Admin privileges
          </label>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm"
            >
              {submitting ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {managers.map((m) => (
          <div
            key={m.id}
            className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3"
          >
            <span className="text-lg">{m.isAdmin ? '👑' : '👤'}</span>
            <div className="flex-1">
              <p className="font-medium">{m.username}</p>
              <p className="text-xs text-slate-400">
                {m.isAdmin ? 'Admin' : 'Manager'} · Joined{' '}
                {new Date(m.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => handleResetPassword(m.id, m.username)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Reset PW
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
