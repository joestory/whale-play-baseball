import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import SessionProvider from '@/components/layout/SessionProvider'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!session.user.isAdmin) redirect('/dashboard')

  return (
    <SessionProvider>
      <div className="min-h-screen">
        <header className="bg-slate-800 text-white px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <span className="font-bold text-sm">⚾ Whale Play — Admin</span>
            <a href="/dashboard" className="text-slate-300 hover:text-white text-sm">
              ← Back to app
            </a>
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
      </div>
    </SessionProvider>
  )
}
