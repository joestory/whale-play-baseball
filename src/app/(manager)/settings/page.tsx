'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'

const ICON_OPTIONS = [
  // Sports & baseball
  '⚾', '🏈', '⚽', '🏀', '🎾', '🏒', '🥊', '🎳', '🏋️', '🤺',
  // Fierce animals
  '🦁', '🐯', '🐆', '🦊', '🐺', '🦝', '🐻', '🐻‍❄️', '🦅', '🦉',
  // Sea & wild
  '🦈', '🐋', '🐬', '🦑', '🦀', '🐊', '🦖', '🦂', '🐍', '🦏',
  // Nature & forces
  '🔥', '⚡', '🌊', '🌪️', '🌋', '❄️', '☀️', '🌑', '☄️', '🌵',
  // Symbols & icons
  '💎', '🏆', '🎯', '🚀', '⭐', '💫', '🌟', '🔱', '⚔️', '🛡️',
]

const inputCls = 'w-full rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-2.5 text-base text-zinc-100 placeholder:text-zinc-600 focus:border-green-500 focus:outline-none transition-colors'
const labelCls = 'block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5'

export default function SettingsPage() {
  const { data: session } = useSession()

  const [icon, setIcon] = useState('')
  const [iconSaving, setIconSaving] = useState(false)
  const [iconMessage, setIconMessage] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMessage, setPwMessage] = useState('')
  const [pwError, setPwError] = useState('')

  // Load current icon from DB
  useEffect(() => {
    fetch('/api/manager/profile/me').then(r => r.json()).then(d => {
      if (d.icon) setIcon(d.icon)
    }).catch(() => {})
  }, [])

  async function handleSaveIcon() {
    setIconSaving(true)
    setIconMessage('')
    try {
      const res = await fetch('/api/manager/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ icon }),
      })
      if (res.ok) setIconMessage('Icon saved!')
      else setIconMessage('Save failed')
    } finally {
      setIconSaving(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    setPwMessage('')

    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match')
      return
    }
    if (newPassword.length < 4) {
      setPwError('Password must be at least 4 characters')
      return
    }

    setPwSaving(true)
    try {
      const res = await fetch('/api/manager/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (res.ok) {
        setPwMessage('Password changed!')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        setPwError(data.error ?? 'Failed to change password')
      }
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

      {/* Icon picker */}
      <section className="bg-[#111111] rounded-xl border border-[#1f1f1f] p-5 space-y-4">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Your Icon</h2>

        <div className="flex items-center gap-4">
          <span className="text-5xl">{icon || '⚾'}</span>
          <p className="text-sm text-zinc-500">Appears next to your name in standings and the draft.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {ICON_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setIcon(opt)}
              className={`w-12 h-12 text-2xl rounded-xl border transition-colors ${
                icon === opt ? 'border-green-500 bg-green-500/10' : 'border-[#262626] bg-[#0a0a0a] hover:border-zinc-500'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        {iconMessage && (
          <p className="text-sm font-medium text-green-400">{iconMessage}</p>
        )}

        <button
          onClick={handleSaveIcon}
          disabled={iconSaving || !icon}
          className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-semibold rounded-lg py-2.5 text-base transition-colors"
        >
          {iconSaving ? 'Saving…' : 'Save Icon'}
        </button>
      </section>

      {/* Change password */}
      <section className="bg-[#111111] rounded-xl border border-[#1f1f1f] p-5 space-y-4">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Change Password</h2>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className={labelCls}>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputCls}
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label className={labelCls}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputCls}
              autoComplete="new-password"
              required
            />
          </div>
          <div>
            <label className={labelCls}>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputCls}
              autoComplete="new-password"
              required
            />
          </div>

          {pwError && <p className="text-sm font-medium text-red-400">{pwError}</p>}
          {pwMessage && <p className="text-sm font-medium text-green-400">{pwMessage}</p>}

          <button
            type="submit"
            disabled={pwSaving}
            className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-semibold rounded-lg py-2.5 text-base transition-colors"
          >
            {pwSaving ? 'Saving…' : 'Change Password'}
          </button>
        </form>
      </section>

      {/* Sign out */}
      <section className="bg-[#111111] rounded-xl border border-[#1f1f1f] p-5">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Account</h2>
        <p className="text-sm text-zinc-500 mb-4">Signed in as <span className="text-zinc-300 font-medium">{session?.user?.name}</span></p>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full bg-[#1a1a1a] hover:bg-[#262626] border border-[#262626] text-zinc-300 font-semibold rounded-lg py-2.5 text-base transition-colors"
        >
          Sign Out
        </button>
      </section>

    </div>
  )
}
