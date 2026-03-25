'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await signIn('credentials', {
      username,
      password,
      redirect: false,
    })

    setLoading(false)

    if (res?.error) {
      setError('Invalid username or password')
    } else {
      const session = await fetch('/api/auth/session').then((r) => r.json())
      router.push(session?.user?.isAdmin ? '/admin' : '/dashboard')
    }
  }

  const inputClass = 'w-full rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-2.5 text-base text-zinc-100 placeholder:text-zinc-600 focus:border-green-500 focus:outline-none transition-colors'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#0a0a0a]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Whale Play</h1>
          <p className="text-zinc-500 text-sm mt-1">Baseball Draft League</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#111111] rounded-2xl border border-[#1f1f1f] p-6 space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">
              Username
            </label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputClass}
              required
            />
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

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-semibold rounded-lg py-2.5 text-base transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
