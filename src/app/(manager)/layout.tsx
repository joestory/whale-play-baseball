import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import SessionProvider from '@/components/layout/SessionProvider'
import MobileNav from '@/components/layout/MobileNav'
import TopNav from '@/components/layout/TopNav'

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.user.isAdmin) redirect('/admin')

  return (
    <SessionProvider>
      <TopNav />
      <div className="min-h-screen pt-14 pb-[max(5rem,calc(5rem+env(safe-area-inset-bottom)))]">
        {children}
      </div>
      <MobileNav />
    </SessionProvider>
  )
}
