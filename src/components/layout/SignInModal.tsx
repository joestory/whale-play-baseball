'use client'

import { useState, useEffect, useRef } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function SignInModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [managers, setManagers] = useState<string[]>([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (open) {
      fetch('/api/managers')
        .then((r) => r.json())
        .then(setManagers)
        .catch(() => {})
      dialogRef.current?.showModal()
    } else {
      dialogRef.current?.close()
      setError('')
      setUsername('')
      setPassword('')
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username) { setError('Select a name'); return }
    setError('')
    setLoading(true)

    const res = await signIn('credentials', { username, password, redirect: false })
    setLoading(false)

    if (res?.error) {
      setError('Wrong password')
    } else {
      setOpen(false)
      const session = await fetch('/api/auth/session').then((r) => r.json())
      router.push(session?.user?.isAdmin ? '/admin' : '/dashboard')
      router.refresh()
    }
  }

  const inputClass =
    'w-full rounded-lg border border-[#2a2a2a] bg-[#111] px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition-colors'

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-zinc-400 hover:text-white border border-[#2a2a2a] hover:border-zinc-500 rounded-md px-3 py-1.5 transition-colors"
      >
        Sign In
      </button>

      {/* Native dialog for accessible modal */}
      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        className="m-auto w-full max-w-xs rounded-2xl border border-[#1f1f1f] bg-[#111] p-6 text-[#fafafa] backdrop:bg-black/60"
      >
        <div>
          <h2 className="text-base font-semibold">Sign In</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Choose your name, enter your password</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">
              Manager
            </label>
            <select
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputClass + ' appearance-none'}
              required
            >
              <option value="">Select a manager…</option>
              {managers.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-lg border border-[#2a2a2a] py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-semibold py-2 text-sm transition-colors"
            >
              {loading ? '…' : 'Sign In'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
