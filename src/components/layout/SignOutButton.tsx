'use client'

import { signOut } from 'next-auth/react'

export default function SignOutButton({ className }: { className?: string }) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className={className ?? 'text-sm text-zinc-500 hover:text-zinc-300 transition-colors'}
    >
      Sign out
    </button>
  )
}
