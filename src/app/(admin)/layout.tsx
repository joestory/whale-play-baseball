import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import SessionProvider from '@/components/layout/SessionProvider'
import AdminNav from '@/components/layout/AdminNav'
import TopNav from '@/components/layout/TopNav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!session.user.isAdmin) redirect('/dashboard')

  return (
    <SessionProvider>
      <TopNav />
      <div className="min-h-screen pt-14 pb-[max(5rem,calc(5rem+env(safe-area-inset-bottom)))]">
        <main className="max-w-lg mx-auto px-4 py-6">{children}</main>
      </div>
      <AdminNav />
    </SessionProvider>
  )
}
